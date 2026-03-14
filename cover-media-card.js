/**
 * Cover Media Card — Home Assistant Lovelace card
 *
 * Minimal config:
 *   type: custom:cover-media-card
 *   players:
 *     - media_player.living_room
 *
 * Full config:
 *   type: custom:cover-media-card
 *   players:
 *     - entity: media_player.living_room
 *       name: Living Room
 *       group_members:
 *         - media_player.kitchen
 *         - media_player.bedroom
 *     - entity: media_player.kitchen
 *       name: Kitchen
 *       visibility:                # hide pill based on conditions
 *         - condition: state
 *           entity: media_player.kitchen
 *           state: playing
 *     - entity: media_player.bedroom
 *       name: Bedroom
 *       buttons:                   # per-player button override
 *         - play_pause
 *         - power
 *   buttons:                       # default: [play_pause, power]
 *     - play_pause
 *     - previous
 *     - next
 *     - volume_down
 *     - volume_up
 *     - shuffle
 *     - repeat
 *     - power
 *     - group
 *     - icon: mdi:netflix           # custom button
 *       label: Open Netflix
 *       tap_action:
 *         action: perform-action
 *         perform_action: media_player.select_source
 *         data:
 *           source: Netflix
 *         target:
 *           entity_id: media_player.living_room
 *       visibility:                # hide button based on conditions
 *         - condition: state
 *           entity: media_player.living_room
 *           state_not: "off"
 *   aspect_ratio: auto             # auto | square  (default: auto)
 *   auto_hide: true                # default: true
 *   show_duration: 10              # seconds (default: 10)
 *   show_on_change: true           # default: true
 *   volume_step: 2                 # percent (default: 2)
 *
 * ─── Visibility conditions ───────────────────────────────────────────────────
 *
 * Supported on both players (pill) and buttons. Evaluated locally — no HA API
 * calls, no polling. Reacts instantly to state changes.
 *
 * Multiple conditions = all must be true (implicit AND):
 *   visibility:
 *     - condition: state
 *       entity: switch.tv
 *       state: "on"
 *     - condition: numeric_state
 *       entity: sensor.volume
 *       above: 10
 *
 * state          entity, state (single or list), or state_not
 * numeric_state  entity, above / below, optional: attribute
 * attribute      entity, attribute, value
 * and            conditions: [...]  — all must be true
 * or             conditions: [...]  — at least one must be true
 *
 * Note: time-based conditions are not supported. Use a template binary_sensor
 * in HA for time-based visibility.
 */

const CARD_VERSION = '0.2.0';

const LONG_PRESS_MS   = 500;   // long press → more-info
const PENDING_MS      = 2000;  // optimistic toggle pending window
const GROUP_WATCHDOG_MS = 8000; // group operation timeout

// ─────────────────────────────────────────────────────────────────────────────
// Button definitions
// ─────────────────────────────────────────────────────────────────────────────

// HA MediaPlayerEntityFeature bitmask constants
const F = {
  PAUSE:        1,
  VOLUME_SET:   4,
  PREV:         16,
  NEXT:         32,
  TURN_ON:      128,
  TURN_OFF:     256,
  VOLUME_STEP:  1024,
  PLAY:         16384,
  SHUFFLE:      32768,
  REPEAT:       262144,
  GROUPING:     524288,
};

const mkIcon = (mdi) => `<ha-icon icon="${mdi}"></ha-icon>`;

const BUTTON_DEFS = {
  previous: {
    icon: () => mkIcon('mdi:skip-previous'),
    label: 'Previous', feature: F.PREV,
  },
  play_pause: {
    icon: (st) => mkIcon(st === 'playing' ? 'mdi:pause' : 'mdi:play'),
    label: 'Play/Pause', isPrimary: true, feature: F.PLAY | F.PAUSE,
  },
  next: {
    icon: () => mkIcon('mdi:skip-next'),
    label: 'Next', feature: F.NEXT,
  },
  shuffle: {
    icon: () => mkIcon('mdi:shuffle'),
    label: 'Shuffle', toggleAttr: 'shuffle', feature: F.SHUFFLE,
  },
  repeat: {
    icon: (v) => mkIcon(v === 'one' ? 'mdi:repeat-once' : 'mdi:repeat'),
    label: 'Repeat', toggleAttr: 'repeat', feature: F.REPEAT,
  },
  volume_up: {
    icon: () => mkIcon('mdi:volume-high'),
    label: 'Volume up', feature: F.VOLUME_SET | F.VOLUME_STEP,
  },
  volume_down: {
    icon: () => mkIcon('mdi:volume-medium'),
    label: 'Volume down', feature: F.VOLUME_SET | F.VOLUME_STEP,
  },
  power: {
    icon: () => mkIcon('mdi:power'),
    label: 'Power', feature: F.TURN_ON | F.TURN_OFF,
  },
  group: {
    icon: () => mkIcon('mdi:speaker-multiple'),
    label: 'Group', feature: F.GROUPING,
  },
};

const DEFAULT_BUTTONS = ['play_pause', 'power'];

// Canonical order for builtin buttons (used for positioning disabled placeholders)
const BUILTIN_KEYS_ORDERED = ['volume_down','volume_up','previous','play_pause','next','shuffle','repeat','power','group'];

// Shared config normalisation (used by both card and editor)
function _normalizeButtons(buttons) {
  const presentKeys = buttons
    .map(b => typeof b === 'string' ? b : (b?.button || b?._disabled))
    .filter(Boolean);
  const missingKeys = BUILTIN_KEYS_ORDERED.filter(k => !presentKeys.includes(k));
  missingKeys.forEach(key => {
    const naturalIdx = BUILTIN_KEYS_ORDERED.indexOf(key);
    let insertAt = buttons.findIndex(
      b => (typeof b === 'string' || b?._disabled || b?.button) &&
           BUILTIN_KEYS_ORDERED.indexOf(b._disabled ?? b?.button ?? b) > naturalIdx
    );
    if (insertAt === -1) insertAt = buttons.length;
    buttons = [...buttons.slice(0, insertAt), { _disabled: key }, ...buttons.slice(insertAt)];
  });
  return buttons;
}

function _normalizeConfig(config) {
  let buttons = _normalizeButtons([...(config.buttons || DEFAULT_BUTTONS)]);

  const players = (config.players || [])
    .map(p => typeof p === 'string' ? { entity: p } : p)
    .filter(p => p?.entity)
    .map(p => p.buttons ? { ...p, buttons: _normalizeButtons([...p.buttons]) } : p);

  // Auto-enable group button if any player has group_members configured,
  // unless the user explicitly disabled it in their original config.
  const hasGroupMembers   = players.some(p => p.group_members?.length);
  const userDisabledGroup = (config.buttons || []).some(b => b?._disabled === 'group');
  if (hasGroupMembers && !userDisabledGroup) {
    buttons = buttons.map(b => b?._disabled === 'group' ? 'group' : b);
  }

  return { show_duration: 10, auto_hide: true, show_on_change: true,
    aspect_ratio: 'auto', volume_step: 2, ...config, players, buttons };
}

class CoverMediaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config             = {};
    this._hass               = null;
    this._playerIdx          = 0;
    this._ctrlVis            = false;
    this._rendered           = false;
    this._pressTimer         = null;
    this._hideTimer          = null;
    this._volTimer           = null;
    this._groupTimer         = null;
    this._showVol            = false;
    this._statusPriority     = 0;
    this._groupExpect        = null;
    this._groupAction        = null;
    this._lastActive         = false;
    this._lastTitle          = null;
    this._lastFeats          = null;
    this._lastIsOff          = null;
    this._lastIsUnavail      = null;
    this._lastGrouped        = null;
    this._lastPillKey        = null;
    this._lastIconIdx        = -1;
    this._lastArtBase        = '';
    this._lastHasArt         = null;
    this._lastTrackKey       = null;
    this._lastBtnStateKey    = null;
    this._pending            = {};
    this._visibleCache       = new Map();
    this._playerVisibleCache = new Map();
    this._lastState          = null;
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  setConfig(config) {
    this._config    = _normalizeConfig(config);
    this._playerIdx = Math.min(this._playerIdx, Math.max(0, this._config.players.length - 1));
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const s    = hass?.states[this._player];
    let stKey = `${s?.state}|${s?.attributes?.app_name}|${s?.attributes?.media_title}`;
    // Watch all entities referenced in any visibility condition
    const _addEntities = (conds) => {
      if (!conds) return;
      const arr = Array.isArray(conds) ? conds : [conds];
      arr.forEach(c => {
        if (c?.entity) stKey += `|${c.entity}:${hass?.states[c.entity]?.state}`;
        if (c?.conditions) _addEntities(c.conditions);
      });
    };
    // Player-level visibility conditions
    this._config.players?.forEach(p => _addEntities(p.visibility));
    // Button visibility conditions — per-player overrides first, then global once
    this._config.players?.forEach(p => {
      if (p.buttons) p.buttons.forEach(b => _addEntities(b?.visibility));
    });
    this._config.buttons?.forEach(b => _addEntities(b?.visibility));
    if (stKey !== this._lastState) {
      this._lastState = stKey;
      this._evalVisible();
    }
    if (!this._rendered) this._render();
    else this._updateCard();
  }

  getCardSize() { return 4; }

  // ── Accessors ───────────────────────────────────────────────────────────────

  get _player() { return this._config.players[this._playerIdx]?.entity ?? null; }
  get _state()  { return this._hass?.states[this._player] ?? null; }
  _attr(a)      { return this._state?.attributes?.[a] ?? null; }

  _toggleVal(attr) {
    const p    = this._pending[attr];
    const real = this._attr(attr);
    if (p && Date.now() < p.until) {
      if (real === p.value || String(real) === String(p.value)) delete this._pending[attr];
      else return p.value;
    }
    return real;
  }
  _setPending(attr, val) { this._pending[attr] = { value: val, until: Date.now() + PENDING_MS }; }

  _playerName(i) {
    const p = this._config.players[i];
    if (!p) return '';
    return p.name
      || this._hass?.states[p.entity]?.attributes?.friendly_name
      || p.entity.split('.')[1]?.replace(/_/g, ' ') || p.entity;
  }
  _playerIcon(i) {
    const p = this._config.players[i];
    return p ? (this._hass?.states[p.entity]?.attributes?.icon || 'mdi:speaker-multiple') : 'mdi:speaker-multiple';
  }

  // ── Visible templates ───────────────────────────────────────────────────────

  _evalVisible() {
    if (!this._hass || !this._player) return;
    const player  = this._config.players[this._playerIdx];
    const buttons = player?.buttons ?? this._config.buttons ?? [];

    let btnChanged  = false;
    let pillChanged = false;

    // Evaluate button visibility conditions
    buttons.forEach((item, idx) => {
      const conds = item?.visibility;
      if (!conds) return;
      const visible = this._evalConditions(conds);
      if (this._visibleCache.get(idx) !== visible) {
        this._visibleCache.set(idx, visible);
        btnChanged = true;
      }
    });

    // Evaluate player visibility conditions
    this._config.players.forEach((p, i) => {
      if (!p.visibility) return;
      const visible = this._evalConditions(p.visibility, p.entity);
      if (this._playerVisibleCache.get(i) !== visible) {
        this._playerVisibleCache.set(i, visible);
        pillChanged = true;
        if (!visible && i === this._playerIdx) {
          const first = this._config.players.findIndex((_, j) =>
            this._playerVisibleCache.get(j) !== false
          );
          if (first !== -1 && first !== this._playerIdx) this._switchPlayer(first);
        }
      }
    });

    if (!this._rendered) return;
    const st = this._state?.state;
    const { mainControls } = this._el;
    if (btnChanged && mainControls)
      mainControls.innerHTML = this._activeButtons().map(b => this._btnHtml(b, st)).join('');
    if (pillChanged) this._updatePills();
  }

  _evalConditions(conditions, entityOverride) {
    // Accept both array and single condition object
    const conds = Array.isArray(conditions) ? conditions : [conditions];
    return conds.every(c => this._evalCondition(c, entityOverride));
  }

  _evalCondition(c, entityOverride) {
    if (!c?.condition) return true;
    const entity  = c.entity ?? entityOverride ?? this._player;
    const state   = this._hass?.states[entity];
    const stVal   = state?.state;
    const attrs   = state?.attributes ?? {};

    switch (c.condition) {
      case 'state': {
        const val = c.state !== undefined ? c.state : c.state_not;
        const arr = Array.isArray(val) ? val : [val];
        const matches = arr.includes(stVal);
        return c.state !== undefined ? matches : !matches;
      }
      case 'numeric_state': {
        const num = c.attribute ? attrs[c.attribute] : parseFloat(stVal);
        if (c.above !== undefined && num <= c.above) return false;
        if (c.below !== undefined && num >= c.below) return false;
        return true;
      }
      case 'attribute':
        return c.attribute in attrs && attrs[c.attribute] == c.value;
      case 'user':
        // user conditions not supported in card context
        return true;
      case 'screen':
        // screen conditions not supported in card context
        return true;
      case 'and':
        return (c.conditions ?? []).every(cc => this._evalCondition(cc, entityOverride));
      case 'or':
        return (c.conditions ?? []).some(cc => this._evalCondition(cc, entityOverride));
      default:
        return true;
    }
  }

  _showCtrl() {
    this._ctrlVis = true;
    this._el?.overlay?.classList.add('visible');
    if (this._config.auto_hide !== false) this._scheduleHide();
  }
  _hideCtrl() {
    this._ctrlVis = false;
    this._el?.overlay?.classList.remove('visible');
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
  }
  _scheduleHide() {
    const isActive = this._state?.state === 'playing' || this._state?.state === 'paused';
    if (!isActive) return;
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => this._hideCtrl(), this._config.show_duration * 1000);
  }
  _toggleCtrl() {
    const isActive = this._state?.state === 'playing' || this._state?.state === 'paused';
    if (!isActive) return; // controls always visible without media
    this._ctrlVis ? this._hideCtrl() : this._showCtrl();
  }

  // ── Player switching ────────────────────────────────────────────────────────

  _switchPlayer(i) {
    this._playerIdx       = i;
    this._lastTitle       = null;
    this._lastFeats       = null;
    this._lastIsOff       = null;
    this._lastIsUnavail   = null;
    this._lastGrouped     = null;
    this._lastState       = null;
    this._showVol         = false;
    this._statusPriority  = 0;
    clearTimeout(this._volTimer);
    this._groupExpect     = null;
    this._groupAction     = null;
    clearTimeout(this._groupTimer);
    this._visibleCache.clear();
    this._playerVisibleCache.clear();
    this._pending         = {};
    this._lastIconIdx     = -1;
    this._lastArtBase     = '';
    this._lastHasArt      = null;
    this._lastTrackKey    = null;
    this._lastBtnStateKey = null;
    this._lastPillKey     = null;
    this._updatePills();
    this._updateCard();
    this._showCtrl();
    this._evalVisible();
  }
  _updatePills() {
    const container = this.shadowRoot.getElementById('playerPills');
    if (!container) return;

    // Compute a group key per player index
    const groupKeys = this._config.players.map(p => {
      const state   = this._hass?.states[p.entity];
      const members = state?.attributes?.group_members ?? [];
      return members.length > 1 ? `${state?.state ?? 'x'}:${[...members].sort().join(',')}` : null;
    });

    const playerVisKey = this._config.players.map((_, i) => this._playerVisibleCache.get(i) ?? true).join('|');
    const playerStateKey = this._config.players.map(p => this._hass?.states[p.entity]?.state ?? 'x').join('|');
    const pillKey = `${this._playerIdx}|${groupKeys.join('|')}|${playerVisKey}|${playerStateKey}`;
    if (pillKey === this._lastPillKey) return;
    this._lastPillKey = pillKey;

    // Cluster players: group together players sharing the same groupKey,
    // preserving order of first appearance
    const seen     = new Map(); // groupKey → cluster index
    const clusters = [];
    this._config.players.forEach((p, i) => {
      if (this._playerVisibleCache.get(i) === false) return; // hidden by visibility template
      const key = groupKeys[i];
      if (key && seen.has(key)) {
        clusters[seen.get(key)].push(i);
      } else {
        seen.set(key, clusters.length);
        clusters.push([i]);
      }
    });

    const parts = [];
    clusters.forEach(cluster => {
      const grouped = cluster.length > 1;
      if (grouped) parts.push('<div class="pill-cluster">');

      cluster.forEach((i, ci) => {
        const p           = this._config.players[i];
        const state       = this._hass?.states[p.entity];
        const unavailable = !state || state.state === 'unavailable';
        const active      = i === this._playerIdx;
        const classes     = ['player-pill', active && 'active', unavailable && 'unavailable'].filter(Boolean).join(' ');
        const icon        = unavailable ? 'mdi:help-circle-outline' : this._playerIcon(i);

        // Only show extra member label on solo pills — cluster already shows grouping visually
        let pillLabel = this._playerName(i);
        if (ci === 0 && cluster.length === 1) {
          const haMembers = state?.attributes?.group_members ?? [];
          if (haMembers.length > 1) {
            const visibleConfigured = new Set(
              this._config.players
                .filter((_, pi) => this._playerVisibleCache.get(pi) !== false)
                .map(q => q.entity)
            );
            const extra = haMembers
              .filter(e => e !== p.entity && !visibleConfigured.has(e))
              .map(e => this._hass?.states[e]?.attributes?.friendly_name
                     || e.split('.')[1]?.replace(/_/g, ' ') || e);
            if (extra.length === 1) pillLabel += ' (+ ' + extra[0] + ')';
            else if (extra.length > 1) pillLabel += ' (+ ' + extra.length + ')';
          }
        }

        parts.push(`<button class="${classes}" data-index="${i}">
          <ha-icon icon="${icon}"></ha-icon>
          <span>${pillLabel}</span>
        </button>`);
      });

      if (grouped) parts.push('</div>');
    });

    container.innerHTML = parts.join('');
  }

  // ── Services ────────────────────────────────────────────────────────────────

  _call(svc, data = {}) {
    if (!this._hass || !this._player) return;
    this._hass.callService('media_player', svc, { entity_id: this._player, ...data });
  }
  _playPause() { this._call('media_play_pause'); }
  _next()        { this._call('media_next_track'); }
  _prev()        { this._call('media_previous_track'); }
  _power() {
    const st        = this._state?.state;
    const supported = this._attr('supported_features') ?? 0;
    if (st === 'off' || !st) {
      if (supported & F.TURN_ON) this._call('turn_on');
    } else {
      this._call(supported & F.TURN_OFF ? 'turn_off' : 'media_stop');
    }
  }

  _toggleShuffle() {
    const next = !(this._toggleVal('shuffle') ?? false);
    this._call('shuffle_set', { shuffle: next });
    this._setPending('shuffle', next);
    this._applyToggle('shuffle');
  }
  _toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const next  = modes[(modes.indexOf(this._toggleVal('repeat') || 'off') + 1) % 3];
    this._call('repeat_set', { repeat: next });
    this._setPending('repeat', next);
    this._applyToggle('repeat');
  }
  _applyToggle(attr) {
    const btn = this.shadowRoot.querySelector(`[data-btn-key="${attr}"]`);
    if (!btn) return;
    const val = this._toggleVal(attr);
    btn.classList.toggle('active-toggle', !!val && val !== 'off');
    btn.innerHTML = BUTTON_DEFS[attr].icon(val);
  }

  _volAdj(delta) {
    const supported = this._attr('supported_features') ?? 0;
    if (supported & F.VOLUME_SET) {
      const step = this._config.volume_step / 100;
      const next = Math.min(1, Math.max(0,
        Math.round(((this._attr('volume_level') ?? 0.5) + delta * step) * 100) / 100));
      this._call('volume_set', { volume_level: next });
      this._flashVol(next);
    } else if (supported & F.VOLUME_STEP) {
      this._call(delta > 0 ? 'volume_up' : 'volume_down');
      const _grouped = (this._attr('group_members')?.length ?? 0) > 1;
      const _sub     = _grouped ? `Volume · ${this._playerName(this._playerIdx)}` : '';
      this._flashStatus(delta > 0 ? 'Volume +' : 'Volume −', _sub, 1);
    }
  }
  _flashStatus(title, sub, priority = 1, duration = 2000) {
    if (this._showVol && priority < this._statusPriority) return;
    this._showVol        = true;
    this._statusPriority = priority;
    // Show overlay without restarting auto-hide timer — that restarts after flash ends
    this._ctrlVis = true;
    this._el?.overlay?.classList.add('visible');
    if (this._el?.trackTitle) this._el.trackTitle.textContent = title;
    if (this._el?.trackArtist) {
      this._el.trackArtist.textContent = sub;
      this._el.trackArtist.style.display = sub ? '' : 'none';
    }
    clearTimeout(this._volTimer);
    this._volTimer = setTimeout(() => {
      this._showVol        = false;
      this._statusPriority = 0;
      this._lastTrackKey   = null; // force DOM update after flash
      this._updateTrackInfo();
      if (this._config.auto_hide !== false) this._scheduleHide();
    }, duration);
  }
  _flashVol(level) {
    const grouped = (this._attr('group_members')?.length ?? 0) > 1;
    const sub     = grouped ? `Volume · ${this._playerName(this._playerIdx)}` : 'Volume';
    this._flashStatus(`${Math.round(level * 100)}%`, sub, 1);
  }

  _fireCustom(ci) {
    if (!this._hass) return;
    const player  = this._config.players[this._playerIdx];
    const buttons = player?.buttons ?? this._config.buttons;
    const customs = buttons.filter(b => b && typeof b === 'object' && !b._disabled && !b.button);
    const btn = customs[ci];
    if (!btn?.tap_action) return;
    const action = btn.tap_action;
    const type   = action.action;
    if (type === 'perform-action') {
      const svc = action.perform_action;
      if (!svc) return;
      const [domain, service] = svc.split('.');
      const data   = { ...(action.data   || {}) };
      const target = { ...(action.target || {}) };
      if (!target.entity_id && !data.entity_id) target.entity_id = this._player;
      this._hass.callService(domain, service, data, target);
    } else if (type === 'toggle') {
      this._hass.callService('homeassistant', 'toggle', {}, { entity_id: this._player });
    } else if (type === 'more-info') {
      this.dispatchEvent(new CustomEvent('hass-more-info',
        { detail: { entityId: action.entity || this._player }, bubbles: true, composed: true }));
    } else if (type === 'navigate' && action.navigation_path) {
      history.pushState(null, '', action.navigation_path);
      window.dispatchEvent(new CustomEvent('location-changed', { bubbles: true }));
    } else if (type === 'url' && action.url_path) {
      window.open(action.url_path, '_blank');
    }
  }

  _group() {
    if (!this._hass || !this._player) return;
    const player  = this._config.players[this._playerIdx];
    const members = player?.group_members ?? [];
    const grouped = (this._attr('group_members')?.length ?? 0) > 1;
    if (!members.length && !grouped) return;

    // Build a readable list of all involved player names
    const allEntities = grouped
      ? (this._attr('group_members') ?? [])
      : [this._player, ...members];
    const memberNames = allEntities
      .map(e => this._hass?.states[e]?.attributes?.friendly_name
              || e.split('.')[1]?.replace(/_/g, ' ') || e)
      .join(' · ');

    if (grouped) {
      this._hass.callService('media_player', 'unjoin', {}, { entity_id: this._player });
      this._groupExpect = false;
      this._groupAction = 'unjoin';
      this._flashStatus('Ungrouping…', memberNames, 2, 9000);
    } else {
      this._hass.callService('media_player', 'join',
        { group_members: members }, { entity_id: this._player });
      this._groupExpect = true;
      this._groupAction = 'join';
      this._flashStatus('Grouping…', memberNames, 2, 9000);
    }
    clearTimeout(this._groupTimer);
    this._groupTimer = setTimeout(() => {
      if (this._groupExpect === null) return; // already resolved
      this._flashStatus(this._groupAction === 'join' ? 'Grouping failed' : 'Ungroup failed', memberNames, 2, 2500);
      // Keep _groupExpect set so we still catch a late HA confirmation
    }, GROUP_WATCHDOG_MS);
  }

  _handleBtn(key) {
    const map = { play_pause: () => this._playPause(), next: () => this._next(),
      previous: () => this._prev(), shuffle: () => this._toggleShuffle(),
      repeat: () => this._toggleRepeat(), power: () => this._power(),
      volume_up: () => this._volAdj(1), volume_down: () => this._volAdj(-1),
      group: () => this._group() };
    map[key]?.();
  }

  // ── Active buttons ──────────────────────────────────────────────────────────

  _activeButtons() {
    const st        = this._state?.state;
    const isOff     = st === 'off';
    const supported = this._attr('supported_features') ?? 0;
    const player    = this._config.players[this._playerIdx];
    const buttons   = player?.buttons ?? this._config.buttons;
    const result = [];
    let ci = 0;
    if (st === 'unavailable' || st === 'unknown' || !st) return result;
    buttons.forEach((item, idx) => {
      if (item?._disabled) return;
      const key = typeof item === 'string' ? item : item?.button;
      if (key) {
        const def = BUTTON_DEFS[key];
        if (!def) return;
        if (isOff && key !== 'power') return;
        if (key === 'group') {
          const alreadyGrouped = (this._attr('group_members')?.length ?? 0) > 1;
          if (!player?.group_members?.length && !alreadyGrouped) return;
        }
        if (def.feature && (supported & def.feature) === 0) return;
        if (item?.visibility !== undefined && this._visibleCache.get(idx) === false) return;
        result.push({ key, ...def });
      } else if (item && typeof item === 'object') {
        if (this._visibleCache.get(idx) === false) { ci++; return; }
        result.push({ isCustom: true, ci: ci++, icon: item.icon, label: item.label || '' });
      }
    });
    return result;
  }

  _btnHtml(btn, st) {
    if (btn.isCustom) {
      return `<button class="ctrl-btn" data-custom-index="${btn.ci}" title="${btn.label}">
        <ha-icon icon="${btn.icon}"></ha-icon></button>`;
    }
    const iconVal  = btn.toggleAttr ? this._toggleVal(btn.toggleAttr) : st;
    const isActive = btn.key === 'group'
                   ? (this._attr('group_members')?.length ?? 0) > 1
                   : btn.toggleAttr
                   ? !!iconVal && iconVal !== 'off'
                   : false;
    return `<button class="ctrl-btn${btn.isPrimary ? ' play' : ''}${isActive ? ' active-toggle' : ''}"
      data-btn-key="${btn.key}" title="${btn.label}">${btn.icon(iconVal)}</button>`;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  _render() {
    this._rendered        = true;
    this._ctrlVis         = false;
    this._lastFeats       = null;
    this._lastIsOff       = null;
    this._lastIsUnavail   = null;
    this._lastGrouped     = null;
    this._lastActive      = false;
    this._lastState       = null;
    this._showVol         = false;
    this._statusPriority  = 0;
    clearTimeout(this._pressTimer);
    clearTimeout(this._hideTimer);
    clearTimeout(this._volTimer);
    clearTimeout(this._groupTimer);
    this._groupExpect     = null;
    this._groupAction     = null;
    this._pending         = {};
    this._visibleCache.clear();
    this._playerVisibleCache.clear();
    this._lastPillKey     = null;
    this._lastTitle       = null;
    this._lastIconIdx     = -1;
    this._lastArtBase     = '';
    this._lastHasArt      = null;
    this._lastTrackKey    = null;
    this._lastBtnStateKey = null;
    const multi = this._config.players.length > 1;
    const st    = this._state?.state;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block;
          --overlay-padding-x: 24px;
          --overlay-padding-y: 28px;
          --ctrl-btn-size: 48px;
          --placeholder-icon-size: 72px;
          --overlay-bg: rgba(0,0,0,0.55);
          --placeholder-bg: #2c2c2e;
          --pill-bg: rgba(255,255,255,0.12);
          --pill-active-bg: #fff;
          --pill-active-color: #111;
        }
        ha-card {
          display: block; position: relative; overflow: hidden;
          isolation: isolate;
          cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
          font-family: var(--primary-font-family, sans-serif);
        }
        /* Aspect ratio wrapper — height driven by padding-bottom trick */
        .card-aspect {
          position: relative; width: 100%; padding-bottom: 100%;
          transition: padding-bottom .4s ease;
        }
        /* Everything inside is absolutely positioned within .card-aspect */
        .card-inner, .art-img, .overlay { position: absolute; inset: 0; }

        .art-img {
          width: 100%; height: 100%;
          object-fit: cover; display: block; opacity: 0; transition: opacity .6s ease;
        }
        .art-img.loaded { opacity: 1; }

        .art-placeholder {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--placeholder-bg);
          opacity: 1; transition: opacity .3s ease;
        }
        .art-placeholder.hidden { opacity: 0; pointer-events: none; }
        .art-placeholder ha-icon {
          --mdc-icon-size: var(--placeholder-icon-size);
          color: rgba(255,255,255,0.12);
        }

        /* ── Overlay ───────────────────────────────────── */
        .overlay {
          z-index: 10;
          display: flex; flex-direction: column;
          align-items: center; justify-content: space-between;
          padding: var(--overlay-padding-y) var(--overlay-padding-x);
          background: transparent; opacity: 0;
          transition: opacity .3s ease, background .3s ease;
          pointer-events: none;
        }
        .overlay.visible { opacity: 1; background: var(--overlay-bg); pointer-events: all; }

        .top-bar { width: 100%; display: flex; justify-content: center; }
        .player-pills { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
        .player-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px 6px 10px; border-radius: 999px; border: none;
          background: var(--pill-bg); color: rgba(255,255,255,0.7);
          font-family: inherit; font-size: 13px; font-weight: 500;
          cursor: pointer; white-space: nowrap;
          transition: background .2s, color .2s;
          box-shadow: 0 1px 4px rgba(0,0,0,.25);
          max-width: calc(100% - var(--overlay-padding-x) * 2);
        }
        .player-pill span { overflow: hidden; text-overflow: ellipsis; }
        .player-pill:hover  { background: rgba(255,255,255,0.22); color: #fff; }
        .player-pill.active { background: var(--pill-active-bg); color: var(--pill-active-color); }
        .pill-cluster {
          display: flex; align-items: center;
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(0,0,0,.25);
          max-width: calc(100% - var(--overlay-padding-x) * 2);
        }
        .pill-cluster .player-pill { box-shadow: none; max-width: none; flex: 1 1 0; min-width: 0; }
        .player-pill.unavailable { opacity: 0.45; }
        .player-pill.unavailable:hover { background: rgba(255,255,255,0.22); color: #fff; }
        .player-pill ha-icon { --mdc-icon-size: 16px; flex-shrink: 0; }
        .pill-cluster .player-pill:not(:last-child) { border-radius: 999px 0 0 999px; }
        .pill-cluster .player-pill:not(:first-child) { border-radius: 0 999px 999px 0; }

        .center-area {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; width: 100%; padding: 0 8px; text-align: center;
          transition: opacity .25s ease;
        }
        .track-title {
          font-size: clamp(20px,6.5vw,28px); font-weight: 700; color: #fff;
          text-shadow: 0 1px 8px rgba(0,0,0,.6); line-height: 1.2;
          overflow-wrap: break-word; word-break: break-word; max-width: 100%;
        }
        .track-artist {
          font-size: clamp(12px,3.5vw,16px); color: rgba(255,255,255,.75);
          text-shadow: 0 1px 4px rgba(0,0,0,.5);
          overflow-wrap: break-word; word-break: break-word; max-width: 100%;
        }

        .controls-wrap { width: 100%; }
        .controls-row  { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }

        .ctrl-btn {
          width: var(--ctrl-btn-size); height: var(--ctrl-btn-size); flex-shrink: 0; border-radius: 50%; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: #fff; background: rgba(255,255,255,.12);
          transition: background .15s, transform .1s, box-shadow .15s;
        }
        .ctrl-btn:hover  { background: rgba(255,255,255,.2); }
        .ctrl-btn:active { transform: scale(.92); }
        .ctrl-btn.play   { background: #fff; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,.3); }
        .ctrl-btn.play:hover { background: rgba(255,255,255,.9); }
        .ctrl-btn.active-toggle { background: #fff; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
        .ctrl-btn.active-toggle:hover { background: rgba(255,255,255,.9); }
        .ctrl-btn ha-icon { pointer-events: none; --mdc-icon-size: 20px; display: flex; }
      </style>

      <ha-card>
        <div class="card-aspect">
          <div class="card-inner" id="cardInner">

            <img class="art-img" id="artImg" src="" alt="" />
            <div class="art-placeholder" id="artPlaceholder">
              <ha-icon id="artPlaceholderIcon" icon="${this._playerIcon(this._playerIdx)}"></ha-icon>
            </div>

            <div class="overlay" id="overlay">
              <div class="top-bar">
                ${multi ? `<div class="player-pills" id="playerPills"></div>` : ''}
              </div>

              <div class="center-area">
                <div class="track-title" id="trackTitle"></div>
                <div class="track-artist" id="trackArtist"></div>
              </div>

              <div class="controls-wrap">
                <div class="controls-row" id="mainControls">
                  ${this._activeButtons().map(b => this._btnHtml(b, st)).join('')}
                </div>
              </div>
            </div>

          </div>
        </div>
      </ha-card>`;

    const inner    = this.shadowRoot.querySelector('#cardInner');
    const controls = this.shadowRoot.querySelector('#mainControls');

    inner.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      this._toggleCtrl();
    });

    // Long press on card → more-info
    inner.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      this._pressTimer = setTimeout(() => {
        this._pressTimer = null;
        this.dispatchEvent(new CustomEvent('hass-more-info',
          { detail: { entityId: this._player }, bubbles: true, composed: true }));
      }, LONG_PRESS_MS);
    });
    const _cancelPress = () => { clearTimeout(this._pressTimer); this._pressTimer = null; };
    inner.addEventListener('pointerup',     _cancelPress);
    inner.addEventListener('pointermove',   _cancelPress);
    inner.addEventListener('pointercancel', _cancelPress);

    // Delegate all control clicks
    controls.addEventListener('click', (e) => {
      const bkey = e.target.closest('[data-btn-key]');
      const bcus = e.target.closest('[data-custom-index]');
      if (!bkey && !bcus) return;
      e.stopPropagation();
      if (bkey) this._handleBtn(bkey.dataset.btnKey);
      if (bcus) this._fireCustom(parseInt(bcus.dataset.customIndex));
      if (this._config.auto_hide !== false) this._scheduleHide();
    });

    if (multi) {
      this.shadowRoot.querySelector('#playerPills').addEventListener('click', (e) => {
        const pill = e.target.closest('.player-pill');
        if (!pill) return;
        e.stopPropagation();
        this._switchPlayer(parseInt(pill.dataset.index));
      });
    }

    const artImg = this.shadowRoot.querySelector('#artImg');
    const cardAspect = this.shadowRoot.querySelector('.card-aspect');
    artImg.addEventListener('load', () => {
      artImg.classList.add('loaded');
      this._applyAspectRatio(artImg, cardAspect);
    });
    artImg.addEventListener('error', () => artImg.classList.remove('loaded'));

    // Cache frequently-accessed DOM refs
    this._el = {
      artImg,
      cardAspect,
      overlay:          this.shadowRoot.querySelector('.overlay'),
      trackTitle:       this.shadowRoot.querySelector('#trackTitle'),
      trackArtist:      this.shadowRoot.querySelector('#trackArtist'),
      centerArea:       this.shadowRoot.querySelector('.center-area'),
      mainControls:     this.shadowRoot.querySelector('#mainControls'),
      artPlaceholder:   this.shadowRoot.querySelector('#artPlaceholder'),
      artPlaceholderIcon: this.shadowRoot.querySelector('#artPlaceholderIcon'),
    };
  }

  _applyAspectRatio(img, aspect) {
    if (this._config.aspect_ratio !== 'auto') {
      aspect.style.paddingBottom = '100%';
      return;
    }
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return;
    aspect.style.paddingBottom = `${Math.max(100, (h / w) * 100).toFixed(2)}%`;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  _updateTrackInfo() {
    if (this._showVol) return;
    const title    = this._attr('media_title') || '';
    const artist   = this._attr('media_artist') || this._attr('app_name') || '';
    const hasMedia = !!(title || artist);
    const st       = this._state?.state;
    const stateLabel = (!hasMedia && st && st !== 'playing' && st !== 'paused')
      ? st.charAt(0).toUpperCase() + st.slice(1) : '';
    const display  = hasMedia ? title : this._playerName(this._playerIdx);
    const sub      = hasMedia ? artist : stateLabel;
    const trackKey = `${display}|${sub}`;
    if (trackKey === this._lastTrackKey) return;
    const wasNull = this._lastTrackKey === null;
    this._lastTrackKey = trackKey;

    const write = () => {
      if (this._el?.trackTitle) this._el.trackTitle.textContent = display;
      if (this._el?.trackArtist) {
        this._el.trackArtist.textContent = sub;
        this._el.trackArtist.style.display = sub ? '' : 'none';
      }
    };

    const ca = this._el?.centerArea;
    if (wasNull || !ca || !this._ctrlVis) { write(); return; }

    ca.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease' })
      .onfinish = () => {
        write();
        ca.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
      };
  }

  _updateCard() {
    if (!this._rendered) return;

    const st       = this._state?.state;
    const isActive = st === 'playing' || st === 'paused';
    // Ignore stale entity_picture when unavailable — HA keeps old value after disconnect
    const artUrl   = (st === 'unavailable' || st === 'unknown' || !st) ? null : this._attr('entity_picture');
    const title    = this._attr('media_title') || '';

    // ── Art ───────────────────────────────────────────────
    const { artImg, cardAspect, overlay, mainControls, artPlaceholder, artPlaceholderIcon } = this._el;
    // Compare the 'cache' param — changes when image changes, unlike the base path
    const _cacheParam = (url) => url?.match(/[?&]cache=([^&]*)/)?.[1] ?? url?.split('?')[0] ?? '';
    const artBase = _cacheParam(artUrl);
    if (artUrl) {
      if (artBase !== this._lastArtBase) {
        this._lastArtBase = artBase;
        artImg.classList.remove('loaded');
        artImg.src = artUrl;
        // ratio applied on load event
      }
    } else {
      if (this._lastArtBase !== '') {
        this._lastArtBase = '';
        artImg.src = '';
        artImg.classList.remove('loaded');
        if (cardAspect) cardAspect.style.paddingBottom = '100%';
      }
    }
    if (artPlaceholder) {
      const hasArt = !!artUrl;
      if (hasArt !== this._lastHasArt) {
        this._lastHasArt = hasArt;
        artPlaceholder.classList.toggle('hidden', hasArt);
      }
      if (artPlaceholderIcon && this._playerIdx !== this._lastIconIdx) {
        this._lastIconIdx = this._playerIdx;
        artPlaceholderIcon.setAttribute('icon', this._playerIcon(this._playerIdx));
      }
    }

    this._updateTrackInfo();

    // ── Group operation success detection ─────────────────────
    if (this._groupExpect !== null) {
      const grouped = (this._attr('group_members')?.length ?? 0) > 1;
      if (grouped === this._groupExpect) {
        clearTimeout(this._groupTimer);
        this._groupExpect = null;
        const haMembers   = this._attr('group_members') ?? [];
        const successNames = (grouped ? haMembers : [this._player])
          .map(e => this._hass?.states[e]?.attributes?.friendly_name
                  || e.split('.')[1]?.replace(/_/g, ' ') || e)
          .join(' · ');
        this._flashStatus(grouped ? 'Grouped' : 'Ungrouped', successNames, 2, 1500);
      }
    }

    // ── Rebuild buttons on feature, off/on, unavailable, or grouped state change ─────
    const feats      = this._attr('supported_features') ?? 0xFFFFFFFF;
    const isOff      = st === 'off';
    const isUnavail  = st === 'unavailable' || st === 'unknown' || !st;
    const grouped    = (this._attr('group_members')?.length ?? 0) > 1;
    if (feats !== this._lastFeats || isOff !== this._lastIsOff || isUnavail !== this._lastIsUnavail || grouped !== this._lastGrouped) {
      this._lastFeats    = feats;
      this._lastIsOff    = isOff;
      this._lastIsUnavail = isUnavail;
      this._lastGrouped  = grouped;
      if (mainControls) mainControls.innerHTML = this._activeButtons().map(b => this._btnHtml(b, st)).join('');
    }

    // ── Update button icons + toggle states ─────────────────
    const shuffle    = this._toggleVal('shuffle');
    const repeat     = this._toggleVal('repeat');
    const btnStateKey = `${st}|${grouped}|${shuffle}|${repeat}`;
    if (btnStateKey !== this._lastBtnStateKey) {
      this._lastBtnStateKey = btnStateKey;
      this.shadowRoot.querySelectorAll('[data-btn-key]').forEach(btn => {
        const key = btn.dataset.btnKey;
        const def = BUTTON_DEFS[key];
        if (!def) return;
        if (key === 'group') {
          btn.classList.toggle('active-toggle', grouped);
        } else if (def.toggleAttr) {
          const val = this._toggleVal(def.toggleAttr);
          btn.classList.toggle('active-toggle', !!val && val !== 'off');
          btn.innerHTML = def.icon(val);
        } else if (key === 'play_pause') {
          btn.innerHTML = def.icon(st);
        }
        // previous, next, power, volume_up/down icons never change — skip
      });
    }

    // ── Controls visibility based on media state ─────────────
    if (!isActive) {
      clearTimeout(this._hideTimer);
      if (!this._ctrlVis) {
        this._ctrlVis = true;
        overlay?.classList.add('visible');
      }
    } else if (!this._lastActive) {
      // Transition inactive → active: start auto-hide timer
      this._showCtrl();
    }
    this._lastActive = isActive;

    if (this._config.players.length > 1) this._updatePills();

    if (title && title !== this._lastTitle) {
      const wasNull = this._lastTitle === null;
      this._lastTitle = title;
      if (!wasNull && isActive && this._config.show_on_change) this._showCtrl();
    }
  }

  static getConfigElement() { return document.createElement('cover-media-card-editor'); }
  static getStubConfig(hass) {
    const player = Object.keys(hass.states).find(e => e.startsWith('media_player.'));
    return { players: player ? [player] : [], buttons: [...DEFAULT_BUTTONS] };
  }
}

customElements.define('cover-media-card', CoverMediaCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'cover-media-card',
  name:        'Cover Media Card',
  description: 'A cover art media player card with auto-hiding controls and multi-player switching.',
  preview:     true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Editor
// ─────────────────────────────────────────────────────────────────────────────

const ALL_BUTTONS_INFO = [
  { key: 'volume_down', label: 'Volume down',  icon: 'mdi:volume-minus' },
  { key: 'volume_up',   label: 'Volume up',    icon: 'mdi:volume-plus' },
  { key: 'previous',    label: 'Previous',     icon: 'mdi:skip-previous' },
  { key: 'play_pause',  label: 'Play / Pause', icon: 'mdi:play-pause' },
  { key: 'next',        label: 'Next',         icon: 'mdi:skip-next' },
  { key: 'shuffle',     label: 'Shuffle',      icon: 'mdi:shuffle' },
  { key: 'repeat',      label: 'Repeat',       icon: 'mdi:repeat' },
  { key: 'power',       label: 'Power',        icon: 'mdi:power' },
  { key: 'group',       label: 'Group',        icon: 'mdi:speaker-multiple' },
];

class CoverMediaCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config    = null;
    this._hass      = null;
    this._built     = false;
    this._expanded  = {};
  }

  set hass(hass) {
    this._hass = hass;
    if (this._playersForm) this._playersForm.hass = hass;
    this.shadowRoot.querySelectorAll('.btn-form').forEach(f => { f.hass = hass; });
  }

  setConfig(config) {
    this._config = _normalizeConfig(config);
    if (!this._built) { this._init(); return; }
    this._pushFormData();
    this._renderButtonList();
  }

  _fire(config) {
    this._config = config;
    const DEFAULTS = { show_duration: 10, auto_hide: true, show_on_change: true, aspect_ratio: 'auto', volume_step: 2 };
    const cleanButtons = (btns) => (btns || []).filter(b => !b?._disabled);
    const clean = {
      ...config,
      buttons: cleanButtons(config.buttons),
      players: (config.players || []).map(p => {
        if (!p.buttons) return p;
        const cleaned = cleanButtons(p.buttons);
        if (!cleaned.length) { const { buttons: _b, ...rest } = p; return rest; }
        return { ...p, buttons: cleaned };
      }),
    };
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (clean[k] === v) delete clean[k];
    }
    this.dispatchEvent(new CustomEvent('config-changed',
      { detail: { config: clean }, bubbles: true, composed: true }));
  }

  // ── Build DOM once ──────────────────────────────────────────────────────────

  _init() {
    if (!this._config) return;
    this._built = true;
    const root  = this.shadowRoot;

    root.appendChild(Object.assign(document.createElement('style'), { textContent: `
      :host { display: block; }
      ha-form { display: block; }

      .settings-rows { display: flex; flex-direction: column; }
      .srow {
        display: flex; align-items: center; justify-content: space-between;
        min-height: 48px; padding: 4px 0;
        border-bottom: 1px solid var(--divider-color);
      }
      .srow:last-child { border-bottom: none; }
      .srow-label { font-size: 14px; color: var(--primary-text-color); flex: 1; }
      .srow-radio-group { padding: 4px 0 2px; border-bottom: 1px solid var(--divider-color); }
      .srow-radio-group:last-child { border-bottom: none; }
      .srow-radio-label {
        font-size: 14px; color: var(--primary-text-color);
        padding: 8px 0 4px;
      }
      .srow-radio-group ha-formfield { display: block; margin-left: -8px; }
      .srow ha-textfield { width: 96px; --text-field-padding: 0 8px; }
      .srow ha-textfield::part(root) { height: 36px; }
      .srow ha-textfield::part(input) { height: 36px; }

      .section-header {
        font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        color: var(--secondary-text-color); border-bottom: 1px solid var(--divider-color);
        padding-bottom: 6px; margin: 24px 0 8px;
      }
      /* First header in the editor root needs no top margin */
      :host > .section-header { margin-top: 0; }

      .btn-list { display: flex; flex-direction: column; }
      .btn-row {
        display: flex; align-items: center; gap: 10px;
        height: 48px; border-bottom: 1px solid var(--divider-color);
      }
      .btn-row:last-child { border-bottom: none; }

      .btn-row-icon { --mdc-icon-size: 20px; flex-shrink: 0; width: 24px;
        color: var(--secondary-text-color); }
      .btn-row.enabled .btn-row-icon { color: var(--primary-text-color); }

      .btn-row-label { flex: 1; font-size: 14px; color: var(--secondary-text-color);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .btn-row.enabled .btn-row-label { color: var(--primary-text-color); }

      .btn-arrows { display: flex; flex-shrink: 0; }
      .btn-arrows ha-icon-button { --mdc-icon-button-size: 30px; --mdc-icon-size: 16px;
        color: var(--secondary-text-color); }
      .btn-arrows ha-icon-button[disabled] { opacity: .25; pointer-events: none; }

      .row-action { width: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      ha-switch { flex-shrink: 0; }
      .expand-btn { --mdc-icon-button-size: 36px; --mdc-icon-size: 18px;
        flex-shrink: 0; color: var(--secondary-text-color); }

      .cb-body { display: none; }
      .cb-body.open { display: block; }
      .cb-body-inner {
        margin-left: 34px; margin-bottom: 4px;
        border-left: 3px solid var(--divider-color);
        padding: 8px 0 4px 12px;
      }
      .cb-sub-label {
        font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        color: var(--secondary-text-color); margin: 14px 0 4px;
      }
      .cb-sub-label:first-child { margin-top: 0; }
      .cb-divider { border: none; border-top: 1px solid var(--divider-color); margin: 12px 0; }
      .cb-delete {
        display: block; width: 100%; margin-top: 8px;
        padding: 4px 0 4px 34px; border: none; background: none; cursor: pointer;
        font-size: 13px; color: var(--error-color, #db4437);
        text-align: left; font-family: inherit;
      }
      .cb-delete:hover { text-decoration: underline; }

      .empty-state {
        font-size: 13px; color: var(--secondary-text-color);
        margin: 6px 0 0; padding: 0; font-style: italic;
      }
      .empty-state.hidden { display: none; }

      /* Config section gets top breathing room from players form */
      .config-section { margin-top: 8px; }

      .settings-sub-label {
        font-size: 11px; font-weight: 600; color: var(--secondary-text-color);
        margin: 16px 0 2px; letter-spacing: .03em;
      }
      .settings-sub-label:first-of-type { margin-top: 4px; }

      ha-button { display: block; margin-top: 12px; }
    ` }));

    // ── Players ─────────────────────────────────────────────
    root.appendChild(Object.assign(document.createElement('div'),
      { className: 'section-header', textContent: 'Media Players' }));

    this._playersForm = document.createElement('ha-form');
    this._playersForm.schema = [{ name: 'players',
      selector: { entity: { multiple: true, domain: 'media_player' } } }];
    this._playersForm.computeLabel = () => '';
    if (this._hass) this._playersForm.hass = this._hass;
    this._playersForm.addEventListener('value-changed', (e) => {
      const entities = e.detail.value.players || [];
      // Preserve existing player objects (name/group_members/buttons), only reorder/add/remove
      const existing = this._config.players;
      const players  = entities.map(entity => existing.find(p => p.entity === entity) || { entity });
      this._fire({ ...this._config, players });
      this._updateEmptyState();
    });
    root.appendChild(this._playersForm);

    this._emptyState = Object.assign(document.createElement('p'), {
      className: 'empty-state',
      textContent: 'Add at least one media player to get started.',
    });
    root.appendChild(this._emptyState);

    // ── Buttons ──────────────────────────────────────────────
    this._configSection = document.createElement('div');
    this._configSection.className = 'config-section';
    const cs = this._configSection;

    cs.appendChild(Object.assign(document.createElement('div'),
      { className: 'section-header', textContent: 'Buttons' }));
    this._btnList = document.createElement('div');
    this._btnList.className = 'btn-list';
    cs.appendChild(this._btnList);

    const addBtn = document.createElement('ha-button');
    addBtn.textContent = 'Add custom button';
    addBtn.addEventListener('click', () => {
      const newItem = { icon: 'mdi:information-outline', label: 'More info',
        tap_action: { action: 'more-info' } };
      const buttons = [...(this._config.buttons || []), newItem];
      this._expanded[buttons.length - 1] = true;
      this._fire({ ...this._config, buttons });
      this._renderButtonList();
    });
    cs.appendChild(addBtn);

    // ── Settings ─────────────────────────────────────────────
    cs.appendChild(Object.assign(document.createElement('div'),
      { className: 'section-header', textContent: 'Settings' }));

    const mkSubLabel = (text) => Object.assign(document.createElement('div'),
      { className: 'settings-sub-label', textContent: text });

    cs.appendChild(mkSubLabel('General'));
    this._generalRows = document.createElement('div');
    this._generalRows.className = 'settings-rows';
    cs.appendChild(this._generalRows);

    cs.appendChild(mkSubLabel('Overlay'));
    this._overlayRows = document.createElement('div');
    this._overlayRows.className = 'settings-rows';
    cs.appendChild(this._overlayRows);

    root.appendChild(cs);

    this._pushFormData();
    this._renderButtonList();
  }

  // ── Settings rendering ───────────────────────────────────────────────────────

  _mkSelectRow(label, key, options) {
    const wrap = document.createElement('div');
    wrap.className = 'srow-radio-group';
    const groupLabel = Object.assign(document.createElement('div'),
      { className: 'srow-radio-label', textContent: label });
    wrap.appendChild(groupLabel);
    const cur = this._config[key] ?? options[0].value;
    options.forEach(({ value, label: optLabel }) => {
      const formfield = document.createElement('ha-formfield');
      formfield.setAttribute('label', optLabel);
      const radio = document.createElement('ha-radio');
      radio.setAttribute('name', key);
      radio.setAttribute('value', value);
      if (value === cur) radio.setAttribute('checked', '');
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        this._config = { ...this._config, [key]: value };
        this._fire(this._config);
        // uncheck siblings
        wrap.querySelectorAll(`ha-radio[name="${key}"]`).forEach(r => {
          if (r !== radio) r.removeAttribute('checked');
        });
      });
      formfield.appendChild(radio);
      wrap.appendChild(formfield);
    });
    return wrap;
  }
  _mkToggleRow(label, key) {
    const row = document.createElement('div');
    row.className = 'srow';
    const lbl = Object.assign(document.createElement('span'), { className: 'srow-label', textContent: label });
    const sw  = document.createElement('ha-switch');
    sw.checked = !!(this._config[key] ?? true);
    sw.addEventListener('change', () => {
      this._config = { ...this._config, [key]: sw.checked };
      this._fire(this._config);
      this._renderSettings();
    });
    row.appendChild(lbl);
    row.appendChild(sw);
    return row;
  }

  _mkNumberRow(label, key, min, max, unit, defaultVal) {
    const row = document.createElement('div');
    row.className = 'srow';
    const lbl   = Object.assign(document.createElement('span'), { className: 'srow-label', textContent: label });
    const field = document.createElement('ha-textfield');
    field.type  = 'number';
    field.setAttribute('min', min);
    field.setAttribute('max', max);
    field.setAttribute('suffix', unit);
    field.setAttribute('no-spinner', '');
    field.value = this._config[key] ?? defaultVal;
    field.addEventListener('change', () => {
      const v = Math.min(max, Math.max(min, parseInt(field.value) || defaultVal));
      field.value = v;
      this._config = { ...this._config, [key]: v };
      this._fire(this._config);
    });
    row.appendChild(lbl);
    row.appendChild(field);
    return row;
  }

  _renderSettings() {
    if (!this._generalRows) return;
    const autoHide  = this._config.auto_hide ?? true;
    const hasVolume = this._config.buttons.some(b => {
      const key = typeof b === 'string' ? b : b?.button;
      return key === 'volume_up' || key === 'volume_down';
    });

    this._generalRows.innerHTML = '';
    this._generalRows.appendChild(this._mkSelectRow('Aspect ratio', 'aspect_ratio', [
      { value: 'auto',   label: 'Auto (follow cover art)' },
      { value: 'square', label: 'Square' },
    ]));
    if (hasVolume) {
      this._generalRows.appendChild(this._mkNumberRow('Volume step', 'volume_step', 1, 50, '%', 2));
    }

    this._overlayRows.innerHTML = '';
    this._overlayRows.appendChild(this._mkToggleRow('Auto-hide', 'auto_hide'));
    if (autoHide) {
      this._overlayRows.appendChild(this._mkNumberRow('Show duration', 'show_duration', 1, 60, 's', 10));
    }
    this._overlayRows.appendChild(this._mkToggleRow('Show on change', 'show_on_change'));
  }

  _pushFormData() {
    const entities = this._config.players.map(p => p.entity).filter(Boolean);
    if (this._playersForm) this._playersForm.data = { players: entities };
    this._renderSettings();
    this._updateEmptyState();
  }

  _updateEmptyState() {
    if (!this._emptyState) return;
    const hasPlayers = this._config.players.length > 0;
    this._emptyState.classList.toggle('hidden', hasPlayers);
    if (this._configSection) this._configSection.style.display = hasPlayers ? '' : 'none';
  }

  // ── Button list ─────────────────────────────────────────────────────────────

  _renderButtonList() {
    const list     = this._btnList;
    const buttons  = this._config.buttons;
    const expanded = this._expanded;
    const save = (newButtons) => { this._fire({ ...this._config, buttons: newButtons }); };
    const mkArrowBtn = (ico, disabled, onClick) => {
      const b = document.createElement('ha-icon-button');
      const i = document.createElement('ha-icon');
      i.setAttribute('icon', ico);
      b.appendChild(i);
      if (disabled) b.setAttribute('disabled', '');
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return b;
    };

    if (!list) return;
    list.innerHTML = '';

    const swapExpanded = (a, b) => {
      const tmp = expanded[a];
      expanded[a] = expanded[b];
      expanded[b] = tmp;
    };

    buttons.forEach((item, arrIdx) => {
      // ── Disabled builtin ───────────────────────────────────
      if (item?._disabled) {
        const key  = item._disabled;
        const info = ALL_BUTTONS_INFO.find(b => b.key === key);
        if (!info) return;
        if (key === 'group' && !this._config.players.some(p => p.group_members?.length)) return;
        const row = document.createElement('div');
        row.className = 'btn-row';
        const icon = document.createElement('ha-icon');
        icon.className = 'btn-row-icon';
        icon.setAttribute('icon', info.icon);
        const label = document.createElement('span');
        label.className = 'btn-row-label';
        label.textContent = info.label;
        const spacer = document.createElement('div');
        spacer.className = 'btn-arrows';
        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'row-action';
        const toggle = document.createElement('ha-switch');
        toggle.checked = false;
        toggle.addEventListener('change', () => {
          const arr = [...buttons];
          arr[arrIdx] = key;
          save(arr);
        });
        toggleWrap.appendChild(toggle);
        row.appendChild(icon); row.appendChild(label);
        row.appendChild(spacer); row.appendChild(toggleWrap);
        list.appendChild(row);
        return;
      }

      const isBuiltin = typeof item === 'string';
      const info      = isBuiltin ? ALL_BUTTONS_INFO.find(b => b.key === item) : null;
      if (isBuiltin && item === 'group' && !this._config.players.some(p => p.group_members?.length)) return;

      const row = document.createElement('div');
      row.className = 'btn-row enabled';

      const icon = document.createElement('ha-icon');
      icon.className = 'btn-row-icon';
      icon.setAttribute('icon', isBuiltin ? info.icon : (item.icon || 'mdi:gesture-tap-button'));

      const label = document.createElement('span');
      label.className = 'btn-row-label';
      label.textContent = isBuiltin ? info.label
        : (item.label || item.tap_action?.perform_action || 'Custom button');

      const prevRealIdx = buttons.slice(0, arrIdx).reduce((p, b, i) => b?._disabled ? p : i, -1);
      const nextRealIdx  = buttons.findIndex((b, i) => i > arrIdx && !b?._disabled);
      const arrows = document.createElement('div');
      arrows.className = 'btn-arrows';
      arrows.appendChild(mkArrowBtn('mdi:arrow-up', prevRealIdx === -1, () => {
        const arr = [...buttons];
        [arr[prevRealIdx], arr[arrIdx]] = [arr[arrIdx], arr[prevRealIdx]];
        swapExpanded(arrIdx, prevRealIdx);
        save(arr);
      }));
      arrows.appendChild(mkArrowBtn('mdi:arrow-down', nextRealIdx === -1, () => {
        const arr = [...buttons];
        [arr[arrIdx], arr[nextRealIdx]] = [arr[nextRealIdx], arr[arrIdx]];
        swapExpanded(arrIdx, nextRealIdx);
        save(arr);
      }));

      row.appendChild(icon);
      row.appendChild(label);
      row.appendChild(arrows);

      if (isBuiltin) {
        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'row-action';
        const toggle = document.createElement('ha-switch');
        toggle.checked = true;
        toggle.addEventListener('change', () => {
          const arr = [...buttons];
          arr[arrIdx] = { _disabled: item };
          save(arr);
        });
        toggleWrap.appendChild(toggle);
        row.appendChild(toggleWrap);
        list.appendChild(row);
      } else {
        const isOpen = !!expanded[arrIdx];

        const expandWrap = document.createElement('div');
        expandWrap.className = 'row-action';
        const expandBtn = document.createElement('ha-icon-button');
        expandBtn.className = 'expand-btn';
        const expandIco = document.createElement('ha-icon');
        expandIco.setAttribute('icon', isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down');
        expandBtn.appendChild(expandIco);
        expandBtn.title = isOpen ? 'Collapse' : 'Edit';
        expandWrap.appendChild(expandBtn);

        const body = document.createElement('div');
        body.className = 'cb-body' + (isOpen ? ' open' : '');
        const bodyInner = document.createElement('div');
        bodyInner.className = 'cb-body-inner';

        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          expanded[arrIdx] = !expanded[arrIdx];
          const open = expanded[arrIdx];
          expandIco.setAttribute('icon', open ? 'mdi:chevron-up' : 'mdi:chevron-down');
          expandBtn.title = open ? 'Collapse' : 'Edit';
          body.classList.toggle('open', open);
        });

        row.appendChild(expandWrap);

        const form = document.createElement('ha-form');
        form.className = 'btn-form';
        form.schema    = [
          { name: 'icon',  selector: { icon: {} } },
          { name: 'label', selector: { text: {} } },
        ];
        form.data = item;
        form.computeLabel = (s) => ({ icon: 'Icon', label: 'Label (tooltip)' }[s.name] || s.name);
        if (this._hass) form.hass = this._hass;
        form.addEventListener('value-changed', (e) => {
          const arr = [...buttons];
          arr[arrIdx] = { ...arr[arrIdx], ...e.detail.value };
          icon.setAttribute('icon', arr[arrIdx].icon || 'mdi:gesture-tap-button');
          label.textContent = arr[arrIdx].label || arr[arrIdx].tap_action?.perform_action || 'Custom button';
          save(arr);
        });

        const actionForm = document.createElement('ha-form');
        actionForm.className = 'btn-form';
        actionForm.schema = [{ name: 'tap_action', selector: { ui_action: {} } }];
        actionForm.data = item;
        actionForm.computeLabel = () => 'Action';
        if (this._hass) actionForm.hass = this._hass;
        actionForm.addEventListener('value-changed', (e) => {
          const arr = [...buttons];
          arr[arrIdx] = { ...arr[arrIdx], ...e.detail.value };
          label.textContent = arr[arrIdx].label || arr[arrIdx].tap_action?.perform_action || 'Custom button';
          save(arr);
        });

        const subLabelAppearance = Object.assign(document.createElement('div'),
          { className: 'cb-sub-label', textContent: 'Button' });
        const divider = document.createElement('hr');
        divider.className = 'cb-divider';
        const subLabelAction = Object.assign(document.createElement('div'),
          { className: 'cb-sub-label', textContent: 'Action' });

        bodyInner.appendChild(subLabelAppearance);
        bodyInner.appendChild(form);
        bodyInner.appendChild(divider);
        bodyInner.appendChild(subLabelAction);
        bodyInner.appendChild(actionForm);

        body.appendChild(bodyInner);

        const delBtn = document.createElement('button');
        delBtn.className = 'cb-delete';
        delBtn.textContent = 'Remove custom button';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          delete expanded[arrIdx];
          save(buttons.filter((_, j) => j !== arrIdx));
        });
        body.appendChild(delBtn);
        list.appendChild(row);
        list.appendChild(body);
      }
    });
  }

}

customElements.define('cover-media-card-editor', CoverMediaCardEditor);

console.info(
  `%c COVER MEDIA CARD %c v${CARD_VERSION} `,
  'background:#111;color:#eee;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px',
  'background:#eee;color:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0'
);

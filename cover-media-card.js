/**
 * Cover Media Card — Home Assistant Lovelace card
 *
 * Minimal config:
 *   type: custom:cover-media-card
 *   players:
 *     - media_player.name
 *
 * Full config:
 *   type: custom:cover-media-card
 *   players:
 *     - entity: media_player.woonkamer
 *       name: Woonkamer          # optional display name
 *     - entity: media_player.appletv
 *   buttons:                     # default: [play_pause, power]
 *     - play_pause
 *     - previous
 *     - next
 *     - power
 *     - volume_up
 *     - volume_down
 *     - shuffle
 *     - repeat
 *     - icon: mdi:information-outline  # custom button
 *       label: More info
 *       tap_action:
 *         action: more-info
 *   aspect_ratio: auto           # auto | square  (default: auto)
 *   auto_hide: true              # default: true
 *   show_duration: 10            # seconds (default: 10)
 *   show_on_change: true          # default: true
 *   volume_step: 2               # percent (default: 2)
 */

const CARD_VERSION = '0.1.4';

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
};

const BUTTON_DEFS = {
  previous: {
    icon: () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="3" height="18" rx="1"/><polygon points="19,21 9,12 19,3"/></svg>`,
    label: 'Previous', feature: F.PREV,
  },
  play_pause: {
    icon: (st) => st === 'playing'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`,
    label: 'Play/Pause', isPrimary: true, feature: F.PLAY | F.PAUSE,
  },
  next: {
    icon: () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 15,12 5,21"/><rect x="16" y="3" width="3" height="18" rx="1"/></svg>`,
    label: 'Next', feature: F.NEXT,
  },
  shuffle: {
    icon: () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>`,
    label: 'Shuffle', toggleAttr: 'shuffle', feature: F.SHUFFLE,
  },
  repeat: {
    icon: (v) => v === 'one'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="14.5" text-anchor="middle" font-size="7" font-weight="bold" fill="currentColor">1</text></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
    label: 'Repeat', toggleAttr: 'repeat', feature: F.REPEAT,
  },
  volume_up: {
    icon: () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
    label: 'Volume up', feature: F.VOLUME_SET | F.VOLUME_STEP,
  },
  volume_down: {
    icon: () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`,
    label: 'Volume down', feature: F.VOLUME_SET | F.VOLUME_STEP,
  },
  power: {
    icon: () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0 1 19 12c0 3.87-3.13 7-7 7A7 7 0 0 1 5 12c0-2.28 1.09-4.3 2.58-5.42L6.17 5.17A8.932 8.932 0 0 0 3 12a9 9 0 0 0 18 0c0-2.74-1.23-5.18-3.17-6.83z"/></svg>`,
    label: 'Power', feature: F.TURN_ON | F.TURN_OFF,
  },
};

const DEFAULT_BUTTONS = ['play_pause', 'power'];

// Canonical order for builtin buttons (used for positioning disabled placeholders)
const BUILTIN_KEYS_ORDERED = ['volume_down','volume_up','previous','play_pause','next','shuffle','repeat','power'];

// Shared config normalisation (used by both card and editor)
function _normalizeConfig(config) {
  let buttons = config.buttons || DEFAULT_BUTTONS;

  // Ensure every builtin key is represented — missing ones become {_disabled:key}
  // inserted at their natural BUILTIN_KEYS position relative to existing builtins.
  const presentKeys = buttons
    .map(b => typeof b === 'string' ? b : b?._disabled)
    .filter(Boolean);
  const missingKeys = BUILTIN_KEYS_ORDERED.filter(k => !presentKeys.includes(k));
  missingKeys.forEach(key => {
    const naturalIdx = BUILTIN_KEYS_ORDERED.indexOf(key);
    let insertAt = buttons.findIndex(
      b => (typeof b === 'string' || b?._disabled) &&
           BUILTIN_KEYS_ORDERED.indexOf(b._disabled ?? b) > naturalIdx
    );
    if (insertAt === -1) insertAt = buttons.length;
    buttons = [...buttons.slice(0, insertAt), { _disabled: key }, ...buttons.slice(insertAt)];
  });

  const players = (config.players || [])
    .map(p => typeof p === 'string' ? { entity: p } : p)
    .filter(p => p?.entity);

  return { show_duration: 10, auto_hide: true, show_on_change: true,
    aspect_ratio: 'auto', volume_step: 2, ...config, players, buttons };
}

class CoverMediaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config      = {};
    this._hass        = null;
    this._playerIdx   = 0;
    this._ctrlVis     = false;
    this._hideTimer   = null;
    this._lastTitle   = null;
    this._rendered    = false;
    this._lastFeats   = null;
    this._lastIsOff   = null;
    this._lastActive  = false;
    this._volTimer    = null;
    this._showVol     = false;
    this._pending     = {};
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  setConfig(config) {
    this._config = _normalizeConfig(config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
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
  _setPending(attr, val) { this._pending[attr] = { value: val, until: Date.now() + 2000 }; }

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

  // ── Visibility ──────────────────────────────────────────────────────────────

  _showCtrl() {
    this._ctrlVis = true;
    this._el?.overlay?.classList.add('visible');
    if (this._config.auto_hide !== false) this._scheduleHide();
  }
  _hideCtrl() {
    this._ctrlVis = false;
    this._el?.overlay?.classList.remove('visible');
    clearTimeout(this._hideTimer);
  }
  _scheduleHide() {
    const isActive = this._state?.state === 'playing' || this._state?.state === 'paused';
    if (!isActive) return;
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => this._hideCtrl(), (this._config.show_duration) * 1000);
  }
  _toggleCtrl() {
    const isActive = this._state?.state === 'playing' || this._state?.state === 'paused';
    if (!isActive) return; // controls always visible without media
    this._ctrlVis ? this._hideCtrl() : this._showCtrl();
  }

  // ── Player switching ────────────────────────────────────────────────────────

  _switchPlayer(i) {
    this._playerIdx  = i;
    this._lastTitle  = null;
    this._lastFeats  = null;
    this._lastIsOff  = null;
    this._pending    = {};
    this._updatePills();
    this._updateCard();
    this._showCtrl();
  }
  _updatePills() {
    this.shadowRoot.querySelectorAll('.player-pill').forEach((pill, i) => {
      pill.classList.toggle('active', i === this._playerIdx);
      pill.querySelector('ha-icon')?.setAttribute('icon', this._playerIcon(i));
      const s = pill.querySelector('span');
      if (s) s.textContent = this._playerName(i);
    });
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
    if (st === 'off' || st === 'unavailable' || !st) {
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
    btn.classList.toggle('active-toggle', !!val && val !== 'off' && val !== false);
    btn.innerHTML = BUTTON_DEFS[attr].icon(val);
  }

  _volAdj(delta) {
    const supported = this._attr('supported_features') ?? 0;
    if (supported & F.VOLUME_SET) {
      const step = (this._config.volume_step) / 100;
      const next = Math.min(1, Math.max(0,
        Math.round(((this._attr('volume_level') ?? 0.5) + delta * step) * 100) / 100));
      this._call('volume_set', { volume_level: next });
      this._flashVol(next);
    } else if (supported & F.VOLUME_STEP) {
      this._call(delta > 0 ? 'volume_up' : 'volume_down');
    }
  }
  _flashVol(level) {
    this._showVol = true;
    clearTimeout(this._volTimer);
    if (this._el?.trackTitle)  this._el.trackTitle.textContent  = `${Math.round(level * 100)}%`;
    if (this._el?.trackArtist) this._el.trackArtist.textContent = 'Volume';
    this._volTimer = setTimeout(() => { this._showVol = false; this._updateTrackInfo(); }, 2000);
  }

  _fireCustom(ci) {
    const customs = this._config.buttons.filter(b => b && typeof b === 'object' && !b._disabled);
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

  _handleBtn(key) {
    const map = { play_pause: () => this._playPause(), next: () => this._next(),
      previous: () => this._prev(), shuffle: () => this._toggleShuffle(),
      repeat: () => this._toggleRepeat(), power: () => this._power(),
      volume_up: () => this._volAdj(1), volume_down: () => this._volAdj(-1) };
    map[key]?.();
  }

  // ── Active buttons ──────────────────────────────────────────────────────────

  _activeButtons() {
    const st        = this._state?.state;
    const isOff     = !st || st === 'off' || st === 'unavailable';
    const supported = this._attr('supported_features') ?? 0xFFFFFFFF;
    const result = [];
    let ci = 0;
    (this._config.buttons).forEach(item => {
      if (item?._disabled) return; // disabled builtin placeholder — skip
      if (typeof item === 'string') {
        const def = BUTTON_DEFS[item];
        if (!def) return;
        // When off, only show the power button
        if (isOff && item !== 'power') return;
        // Hide if feature not supported
        if (def.feature && (supported & def.feature) === 0) return;
        result.push({ key: item, ...def });
      } else if (item && typeof item === 'object') {
        // Custom buttons: always visible, respect player filter
        if (item.players?.length && !item.players.includes(this._player)) { ci++; return; }
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
    return `<button class="ctrl-btn${btn.isPrimary ? ' play' : ''}"
      data-btn-key="${btn.key}" title="${btn.label}">${btn.icon(st)}</button>`;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  _render() {
    this._rendered  = true;
    this._ctrlVis   = false;
    this._lastFeats = null;
    this._lastIsOff = null;
    this._lastActive = false;
    const multi = this._config.players.length > 1;
    const st    = this._state?.state;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
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

        /* ── Overlay ───────────────────────────────────── */
        .overlay {
          z-index: 10;
          display: flex; flex-direction: column;
          align-items: center; justify-content: space-between;
          padding: 28px 24px;
          background: transparent; opacity: 0;
          transition: opacity .3s ease, background .3s ease;
          pointer-events: none;
        }
        .overlay.visible { opacity: 1; background: rgba(0,0,0,0.55); pointer-events: all; }

        .top-bar { width: 100%; display: flex; justify-content: center; }
        .player-pills { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
        .player-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px 6px 10px; border-radius: 999px; border: none;
          background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.7);
          font-family: inherit; font-size: 13px; font-weight: 500;
          cursor: pointer; white-space: nowrap;
          transition: background .2s, color .2s;
          box-shadow: 0 1px 4px rgba(0,0,0,.25); backdrop-filter: blur(4px);
        }
        .player-pill:hover  { background: rgba(255,255,255,0.22); color: #fff; }
        .player-pill.active { background: #fff; color: #111; font-weight: 600; }
        .player-pill ha-icon { --mdc-icon-size: 16px; flex-shrink: 0; }

        .center-area {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; width: 100%; padding: 0 8px; text-align: center;
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
          width: 48px; height: 48px; flex-shrink: 0; border-radius: 50%; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: #fff; background: rgba(255,255,255,.12);
          transition: background .15s, transform .1s;
        }
        .ctrl-btn:hover  { background: rgba(255,255,255,.2); }
        .ctrl-btn:active { transform: scale(.92); }
        .ctrl-btn.play   { background: #fff; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,.3); }
        .ctrl-btn.play:hover { background: rgba(255,255,255,.9); }
        .ctrl-btn.active-toggle { background: #fff; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
        .ctrl-btn.active-toggle:hover { background: rgba(255,255,255,.9); }
        .ctrl-btn svg, .ctrl-btn ha-icon { pointer-events: none; }
        .ctrl-btn ha-icon { --mdc-icon-size: 20px; }


      </style>

      <ha-card>
        <div class="card-aspect">
        <div class="card-inner" id="cardInner">

          <img class="art-img" id="artImg" src="" alt="" />

          <div class="overlay" id="overlay">
            <div class="top-bar">
              ${multi ? `<div class="player-pills" id="playerPills">
                ${this._config.players.map((p, i) => `
                  <button class="player-pill${i === 0 ? ' active' : ''}" data-index="${i}">
                    <ha-icon icon="${this._playerIcon(i)}"></ha-icon>
                    <span>${this._playerName(i)}</span>
                  </button>`).join('')}
              </div>` : ''}
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
      </ha-card>`;

    const inner    = this.shadowRoot.querySelector('#cardInner');
    const controls = this.shadowRoot.querySelector('#mainControls');

    inner.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      this._toggleCtrl();
    });

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
      overlay:      this.shadowRoot.querySelector('.overlay'),
      trackTitle:   this.shadowRoot.querySelector('#trackTitle'),
      trackArtist:  this.shadowRoot.querySelector('#trackArtist'),
      mainControls: this.shadowRoot.querySelector('#mainControls'),
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
    const title    = this._attr('media_title') || this._attr('media_content_id') || '';
    const artist   = this._attr('media_artist') || this._attr('app_name') || '';
    const hasMedia = !!(title || artist);
    if (this._el?.trackTitle)  this._el.trackTitle.textContent = hasMedia ? title : this._playerName(this._playerIdx);
    if (this._el?.trackArtist) {
      this._el.trackArtist.textContent = artist;
      this._el.trackArtist.style.display = hasMedia ? '' : 'none';
    }
  }

  _updateCard() {
    if (!this._rendered) return;

    const st       = this._state?.state;
    const isActive = st === 'playing' || st === 'paused';
    const artUrl   = this._attr('entity_picture');
    const title    = this._attr('media_title') || this._attr('media_content_id') || '';

    // ── Art ───────────────────────────────────────────────
    const { artImg, cardAspect, overlay, mainControls } = this._el;
    if (artUrl) {
      if (artImg.getAttribute('src') !== artUrl) {
        artImg.classList.remove('loaded');
        artImg.src = artUrl;
        // ratio applied on load event
      }
    } else {
      artImg.src = '';
      artImg.classList.remove('loaded');
      if (cardAspect) cardAspect.style.paddingBottom = '100%';
    }

    this._updateTrackInfo();

    // ── Rebuild buttons on feature or off/on state change ─────
    const feats  = this._attr('supported_features') ?? 0xFFFFFFFF;
    const isOff  = !st || st === 'off' || st === 'unavailable';
    if (feats !== this._lastFeats || isOff !== this._lastIsOff) {
      this._lastFeats = feats;
      this._lastIsOff = isOff;
      if (mainControls) mainControls.innerHTML = this._activeButtons().map(b => this._btnHtml(b, st)).join('');
    }

    // ── Update button icons + toggle states ─────────────────
    this.shadowRoot.querySelectorAll('[data-btn-key]').forEach(btn => {
      const def = BUTTON_DEFS[btn.dataset.btnKey];
      if (!def) return;
      if (def.toggleAttr) {
        const val = this._toggleVal(def.toggleAttr);
        btn.classList.toggle('active-toggle', !!val && val !== 'off' && val !== false);
        btn.innerHTML = def.icon(val);
      } else {
        btn.innerHTML = def.icon(st);
      }
    });

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
];
class CoverMediaCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config   = null;
    this._hass     = null;
    this._built    = false;
    this._expanded = {};
  }

  set hass(hass) {
    this._hass = hass;
    if (this._playersForm) this._playersForm.hass = hass;
    this.shadowRoot.querySelectorAll('.btn-form').forEach(f => { f.hass = hass; });
  }

  setConfig(config) {
    const prevLen = this._config?.buttons?.length ?? -1;
    this._config  = _normalizeConfig(config);
    if (!this._built) { this._init(); return; }
    this._pushFormData();
    if (this._config.buttons.length !== prevLen) {
      this._renderButtonList();
      this._renderSettings();
    } else {
      this._updateBtnForms();
    }
  }

  _fire(config) {
    this._config = config;
    const DEFAULTS = { show_duration: 10, auto_hide: true, show_on_change: true, aspect_ratio: 'auto', volume_step: 2 };
    const clean = { ...config, buttons: (config.buttons || []).filter(b => !b?._disabled) };
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
      this._fire({ ...this._config, players: e.detail.value.players });
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
    this._updateEmptyState();
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
    const hasVolume = this._config.buttons.some(b => b === 'volume_up' || b === 'volume_down');

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
    const entities = this._config.players.map(p => p.entity || p).filter(Boolean);
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
    const list = this._btnList;
    if (!list) return;
    list.innerHTML = '';

    const buttons = this._config.buttons;

    const mkArrowBtn = (ico, disabled, onClick) => {
      const b = document.createElement('ha-icon-button');
      const i = document.createElement('ha-icon');
      i.setAttribute('icon', ico);
      b.appendChild(i);
      if (disabled) b.setAttribute('disabled', '');
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return b;
    };

    const swapExpanded = (a, b) => {
      const tmp = this._expanded[a];
      this._expanded[a] = this._expanded[b];
      this._expanded[b] = tmp;
    };

    buttons.forEach((item, arrIdx) => {
      // ── Disabled builtin ───────────────────────────────────
      if (item?._disabled) {
        const key  = item._disabled;
        const info = ALL_BUTTONS_INFO.find(b => b.key === key);
        if (!info) return;
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
          // Replace the {_disabled} marker with the real key — position preserved
          const arr = [...buttons];
          arr[arrIdx] = key;
          this._fire({ ...this._config, buttons: arr });
          this._renderButtonList();
        });
        toggleWrap.appendChild(toggle);
        row.appendChild(icon); row.appendChild(label);
        row.appendChild(spacer); row.appendChild(toggleWrap);
        list.appendChild(row);
        return;
      }

      const isBuiltin = typeof item === 'string';
      const info      = isBuiltin ? ALL_BUTTONS_INFO.find(b => b.key === item) : null;

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
        this._fire({ ...this._config, buttons: arr });
        this._renderButtonList();
      }));
      arrows.appendChild(mkArrowBtn('mdi:arrow-down', nextRealIdx === -1, () => {
        const arr = [...buttons];
        [arr[arrIdx], arr[nextRealIdx]] = [arr[nextRealIdx], arr[arrIdx]];
        swapExpanded(arrIdx, nextRealIdx);
        this._fire({ ...this._config, buttons: arr });
        this._renderButtonList();
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
          // Replace the key with a {_disabled} marker — position preserved
          const arr = [...buttons];
          arr[arrIdx] = { _disabled: item };
          this._fire({ ...this._config, buttons: arr });
          this._renderButtonList();
        });
        toggleWrap.appendChild(toggle);
        row.appendChild(toggleWrap);
        list.appendChild(row);
      } else {
        const isOpen = !!this._expanded[arrIdx];

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
          this._expanded[arrIdx] = !this._expanded[arrIdx];
          const open = this._expanded[arrIdx];
          expandIco.setAttribute('icon', open ? 'mdi:chevron-up' : 'mdi:chevron-down');
          expandBtn.title = open ? 'Collapse' : 'Edit';
          body.classList.toggle('open', open);
        });

        row.appendChild(expandWrap);

        const form = document.createElement('ha-form');
        form.className = 'btn-form';
        form.schema    = [
          { name: 'icon',       selector: { icon: {} } },
          { name: 'label',      selector: { text: {} } },
          { name: 'players',    selector: { entity: { multiple: true, domain: 'media_player' } } },
        ];
        form.data = item;
        form.computeLabel = (s) => ({
          icon: 'Icon', label: 'Label (tooltip)',
          players: 'Show only for these players (empty = always)',
        }[s.name] || s.name);
        if (this._hass) form.hass = this._hass;
        form.addEventListener('value-changed', (e) => {
          const arr = [...buttons];
          arr[arrIdx] = { ...arr[arrIdx], ...e.detail.value };
          icon.setAttribute('icon', arr[arrIdx].icon || 'mdi:gesture-tap-button');
          label.textContent = arr[arrIdx].label || arr[arrIdx].tap_action?.perform_action || 'Custom button';
          this._fire({ ...this._config, buttons: arr });
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
          this._fire({ ...this._config, buttons: arr });
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
          delete this._expanded[arrIdx];
          this._fire({ ...this._config, buttons: buttons.filter((_, j) => j !== arrIdx) });
          this._renderButtonList();
        });
        body.appendChild(delBtn);
        list.appendChild(row);
        list.appendChild(body);
      }
    });
  }

  _updateBtnForms() {
    const buttons = this._config.buttons;
    let fi = 0;
    const forms = [...(this._btnList?.querySelectorAll('.btn-form') || [])];
    buttons.forEach(item => {
      if (!item || typeof item !== 'object' || item._disabled) return;
      if (forms[fi])   forms[fi].data   = item;
      if (forms[fi+1]) forms[fi+1].data = item;
      fi += 2;
    });
  }
}

customElements.define('cover-media-card-editor', CoverMediaCardEditor);

console.info(
  `%c COVER MEDIA CARD %c v${CARD_VERSION} `,
  'background:#111;color:#eee;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px',
  'background:#eee;color:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0'
);

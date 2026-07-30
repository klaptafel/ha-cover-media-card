/**
 * Cover Media Card: Home Assistant Lovelace card
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
 *   ratio_min: "16:9"             # most landscape the card can get (default: 16:9)
 *   ratio_max: "9:16"             # most portrait the card can get  (default: 9:16)
 *                                  # set ratio_min = ratio_max for a fixed aspect ratio
 *   art_style: fill                # fill | fit  (default: fill)
 *                                  # fit always shows a blurred background behind the art
 *   art_edge_to_edge: true         # fit only: art fills card edge-to-edge (default: true)
 *                                  # set to false for padding, radius and shadow around art
 *   art_padding: 8                 # fit + edge_to_edge:false: padding in % (default: 8)
 *   art_radius: 12                 # fit + edge_to_edge:false: border radius in px
 *                                  # default: auto (ha-card radius + padding * 0.15, max 64px)
 *   auto_hide: true                # default: true
 *   show_duration: 10              # seconds (default: 10)
 *   show_on_change: true           # default: true
 *   volume_step: 2                 # percent (default: 2)
 *   auto_switch: 30               # seconds before auto-switching to a playing player (default: 0 = off)
 *
 * ─── Visibility conditions ───────────────────────────────────────────────────
 *
 * Supported on both players (pill) and buttons. Evaluated locally: no HA API
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
 * and            conditions: [...]  (all must be true)
 * or             conditions: [...]  (at least one must be true)
 *
 * Note: time-based conditions are not supported. Use a template binary_sensor
 * in HA for time-based visibility.
 */

const CARD_VERSION = '0.6.2';

const LONG_PRESS_MS   = 500;   // long press → more-info
const PENDING_MS      = 2000;  // optimistic toggle pending window
const GROUP_WATCHDOG_MS = 8000; // group operation timeout
const STATUS_MS              = 2000;  // default status flash duration

// ─────────────────────────────────────────────────────────────────────────────
// Translations
// ─────────────────────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    lang: 'en',
    btn_previous: 'Previous', btn_play_pause: 'Play/Pause', btn_next: 'Next',
    btn_shuffle: 'Shuffle', btn_repeat: 'Repeat',
    btn_volume_up: 'Volume up', btn_volume_down: 'Volume down',
    btn_power: 'Power', btn_group: 'Group',
    volume: 'Volume', volume_up_flash: 'Volume +', volume_down_flash: 'Volume −',
    ungrouping: 'Ungrouping…', grouping: 'Grouping…',
    grouping_failed: 'Grouping failed', ungroup_failed: 'Ungroup failed',
    grouped: 'Grouped', ungrouped: 'Ungrouped',
    error_no_player: 'No player configured',
    error_no_player_sub: 'Add a media player in the card editor',
    error_player_not_found: 'Player not found',
    error_players_not_found: 'Players not found',
    error_some_players_not_found: 'Some players not found',
    tab_players: 'Players', tab_buttons: 'Buttons', tab_settings: 'Settings',
    drag_to_reorder: 'Drag to reorder',
    no_players_configured: 'No players configured. Add one below to get started.',
    entity: 'Entity', display_name: 'Display name',
    group_members: 'Group members',
    group_members_desc: 'Works best between speakers of the same brand',
    add_player: 'Add player',
    row_volume_down: 'Volume down', row_volume_up: 'Volume up',
    row_previous: 'Previous', row_play_pause: 'Play / Pause', row_next: 'Next',
    row_shuffle: 'Shuffle', row_repeat: 'Repeat', row_power: 'Power', row_group: 'Group',
    custom_button_fallback: 'Custom button',
    field_icon: 'Icon', field_label_tooltip: 'Label (tooltip)',
    button_header: 'Button', action_header: 'Action',
    choose_action_hint: 'Choose an action above to make this button do something.',
    add_custom_button: 'Add custom button',
    default_custom_button_label: 'More info',
    section_aspect_ratio: 'Aspect ratio', aspect_min: 'Min', aspect_max: 'Max',
    section_art: 'Art', style: 'Style',
    art_fill: 'Fill',
    art_fit: 'Fit',
    edge_to_edge: 'Edge to edge', padding: 'Padding',
    section_general: 'General',
    volume_step: 'Volume step',
    volume_step_desc: 'How much the volume changes per button press',
    volume_step_disabled: 'Add a volume up or down button to use this',
    section_overlay: 'Overlay',
    auto_hide: 'Auto-hide',
    auto_hide_desc: 'Hide the controls after a few seconds during playback',
    show_duration: 'Show duration',
    show_duration_desc: 'How long the controls stay visible before hiding',
    overlay_disabled_reason: 'Only applies when auto-hide is on',
    show_on_change: 'Show on change',
    show_on_change_desc: 'Briefly re-show the controls when the media changes',
    section_player_switching: 'Player switching',
    auto_switch: 'Auto switch',
    auto_switch_desc: 'Switches to another player when it starts playing and this one is idle',
    multi_required: 'Add more than one player to use this',
    delay: 'Delay',
    delay_desc: 'Wait this long before switching, in case the current player resumes',
    enable_auto_switch: 'Enable auto switch to use this',
  },
  nl: {
    lang: 'nl',
    btn_previous: 'Vorige', btn_play_pause: 'Afspelen/pauzeren', btn_next: 'Volgende',
    btn_shuffle: 'Shuffle', btn_repeat: 'Herhalen',
    btn_volume_up: 'Volume omhoog', btn_volume_down: 'Volume omlaag',
    btn_power: 'Aan/uit', btn_group: 'Groeperen',
    volume: 'Volume', volume_up_flash: 'Volume +', volume_down_flash: 'Volume −',
    ungrouping: 'Groep opheffen…', grouping: 'Groeperen…',
    grouping_failed: 'Groeperen mislukt', ungroup_failed: 'Groep opheffen mislukt',
    grouped: 'Gegroepeerd', ungrouped: 'Groep opgeheven',
    error_no_player: 'Geen speler geconfigureerd',
    error_no_player_sub: 'Voeg een mediaspeler toe in de kaart-editor',
    error_player_not_found: 'Speler niet gevonden',
    error_players_not_found: 'Spelers niet gevonden',
    error_some_players_not_found: 'Sommige spelers niet gevonden',
    tab_players: 'Spelers', tab_buttons: 'Knoppen', tab_settings: 'Instellingen',
    drag_to_reorder: 'Sleep om te herschikken',
    no_players_configured: 'Geen spelers geconfigureerd. Voeg er hieronder een toe om te beginnen.',
    entity: 'Entiteit', display_name: 'Weergavenaam',
    group_members: 'Groepsleden',
    group_members_desc: 'Werkt het beste tussen speakers van hetzelfde merk',
    add_player: 'Speler toevoegen',
    row_volume_down: 'Volume omlaag', row_volume_up: 'Volume omhoog',
    row_previous: 'Vorige', row_play_pause: 'Afspelen / pauzeren', row_next: 'Volgende',
    row_shuffle: 'Shuffle', row_repeat: 'Herhalen', row_power: 'Aan/uit', row_group: 'Groeperen',
    custom_button_fallback: 'Aangepaste knop',
    field_icon: 'Icoon', field_label_tooltip: 'Label (tooltip)',
    button_header: 'Knop', action_header: 'Actie',
    choose_action_hint: 'Kies hierboven een actie om deze knop iets te laten doen.',
    add_custom_button: 'Aangepaste knop toevoegen',
    default_custom_button_label: 'Meer info',
    section_aspect_ratio: 'Beeldverhouding', aspect_min: 'Min', aspect_max: 'Max',
    section_art: 'Coverafbeelding', style: 'Stijl',
    art_fill: 'Vullen',
    art_fit: 'Passend',
    edge_to_edge: 'Randloos', padding: 'Padding',
    section_general: 'Algemeen',
    volume_step: 'Volumestap',
    volume_step_desc: 'Hoeveel het volume wijzigt per druk op de knop',
    volume_step_disabled: 'Voeg een volume-omhoog- of omlaag-knop toe om dit te gebruiken',
    section_overlay: 'Overlay',
    auto_hide: 'Automatisch verbergen',
    auto_hide_desc: 'Verberg de bediening na een paar seconden tijdens het afspelen',
    show_duration: 'Zichtbaarheidsduur',
    show_duration_desc: 'Hoe lang de bediening zichtbaar blijft voordat deze verbergt',
    overlay_disabled_reason: 'Alleen van toepassing als automatisch verbergen aan staat',
    show_on_change: 'Tonen bij wijziging',
    show_on_change_desc: 'Toon de bediening kort opnieuw wanneer de media wijzigt',
    section_player_switching: 'Wisselen van speler',
    auto_switch: 'Automatisch wisselen',
    auto_switch_desc: 'Wisselt naar een andere speler zodra die begint met afspelen en deze inactief is',
    multi_required: 'Voeg meer dan één speler toe om dit te gebruiken',
    delay: 'Vertraging',
    delay_desc: 'Wacht zo lang voor het wisselt, voor het geval de huidige speler hervat',
    enable_auto_switch: 'Zet automatisch wisselen aan om dit te gebruiken',
  },
};

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

// Media content types where shuffle/repeat make no sense (live/linear streams)
const LIVE_TYPES = new Set(['radio', 'channel', 'url']);

const mkIcon = (mdi) => `<ha-icon icon="${mdi}"></ha-icon>`;
// Prefers HA's own registry-aware name composition (device+entity name,
// area overrides, etc., same logic HA core itself uses) when available;
// falls back to a plain friendly_name/humanized-entity_id lookup for older
// HA versions that don't have formatEntityName yet, or when the entity
// doesn't exist in hass.states at all (formatEntityName requires a real
// stateObj).
const _entityName = (entity, hass) => {
  const stateObj = hass?.states[entity];
  if (stateObj && typeof hass.formatEntityName === 'function') {
    return hass.formatEntityName(stateObj);
  }
  return stateObj?.attributes?.friendly_name
    || entity.split('.')[1]?.replace(/_/g, ' ') || entity;
};
const _cacheParam = (url) => url?.match(/[?&]cache=([^&]*)/)?.[1] ?? url?.split('?')[0] ?? '';
const _appLogoUrl = (appName) => {
  if (!appName) return null;
  const slug = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://raw.githubusercontent.com/klaptafel/ha-cover-media-card/main/apps/${slug}.png`;
};

// Convert a ratio string like "9:16" to a padding-bottom percentage (h/w * 100)
const _ratioPct = (ratio) => {
  const [w, h] = ratio.split(':').map(Number);
  return (h / w) * 100;
};

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
  return buttons;
}

// Single source of truth, shared by CoverMediaCard.setConfig and the editor.
const CARD_DEFAULTS = {
  show_duration: 10, auto_hide: true, show_on_change: true,
  ratio_min: '16:9', ratio_max: '9:16',
  art_style: 'fill', art_edge_to_edge: true, art_padding: 8, art_radius: null,
  volume_step: 2, auto_switch: 0,
};

function deepEqual(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((k) => deepEqual(a[k], b[k]));
  }
  return a === b;
}

// Only keep keys that differ from CARD_DEFAULTS (or have no default at all,
// e.g. `players`/`buttons`): _normalizeConfig merges every default into
// _config for internal rendering, but firing that whole merged object back
// would persist every untouched default into the saved YAML.
function stripDefaults(config) {
  const out = {};
  for (const [key, value] of Object.entries(config)) {
    if (key in CARD_DEFAULTS && deepEqual(value, CARD_DEFAULTS[key])) continue;
    out[key] = value;
  }
  return out;
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

  // Migrate legacy aspect_ratio: square → fixed 1:1
  // Migrate old four portrait/landscape keys → two ratio keys
  const legacyMigration = {};
  if (config.aspect_ratio === 'square') {
    legacyMigration.ratio_min = '1:1';
    legacyMigration.ratio_max = '1:1';
  } else if (config.portrait_min || config.portrait_max || config.landscape_min || config.landscape_max) {
    // Best-effort: use portrait_max as ratio_max and landscape_max as ratio_min
    if (config.portrait_max)  legacyMigration.ratio_max = config.portrait_max;
    if (config.landscape_max) legacyMigration.ratio_min = config.landscape_max;
  }

  return {
    ...CARD_DEFAULTS,
    ...config, ...legacyMigration, players, buttons,
  };
}

// Entities referenced in any visibility condition (player-level, button
// overrides, top-level buttons), plus player entities themselves when
// auto_switch is on. Only depends on config, so this is computed once in
// setConfig rather than walked again on every hass tick.
function _collectWatchedEntities(config) {
  const entities = [];
  const addEntities = (conds) => {
    if (!conds) return;
    const arr = Array.isArray(conds) ? conds : [conds];
    arr.forEach(c => {
      if (c?.entity) entities.push(c.entity);
      if (c?.conditions) addEntities(c.conditions);
    });
  };
  config.players?.forEach(p => {
    addEntities(p.visibility);
    if (p.buttons) p.buttons.forEach(b => addEntities(b?.visibility));
    if (config.auto_switch > 0) entities.push(p.entity);
  });
  config.buttons?.forEach(b => addEntities(b?.visibility));
  return entities;
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
    this._autoSwitchTimer    = null;
    this._cooldownTimer      = null;
    this._initialLoad        = true;
    this._autoSwitchCooldown = false;
    this._showVol            = false;
    this._statusPriority     = 0;
    this._configError        = false;
    this._groupExpect        = null;
    this._lastActive         = false;
    this._firstShow          = true;
    this._lastTitle          = null;
    this._lastFeats          = null;
    this._lastIsOff          = null;
    this._lastIsUnavail      = null;
    this._lastGrouped        = null;
    this._lastPillKey        = null;
    this._lastIconIdx        = -1;
    this._lastArtBase        = '';
    this._lastHasArt         = null;
    this._lastAspectPct      = null;
    this._lastTrackKey       = null;
    this._lastBtnStateKey    = null;
    this._lastContentType    = null;
    this._pending            = {};
    this._visibleCache       = new Map();
    this._playerVisibleCache = new Map();
    this._lastState          = null;
    this._trackAnim          = null;
    this._lastArtStyle       = null;
    this._lastBlurVisible    = null;
    this._watchedEntities    = [];
    this._activeButtonsCache = null;
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  setConfig(config) {
    this._config    = _normalizeConfig(config);
    this._playerIdx = Math.min(this._playerIdx, Math.max(0, this._config.players.length - 1));
    this._watchedEntities = _collectWatchedEntities(this._config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._activeButtonsCache = null;
    const s    = hass?.states[this._player];
    let stKey = `${s?.state}|${s?.attributes?.media_title}|${s?.attributes?.media_artist}|${s?.attributes?.app_name}|${s?.attributes?.media_content_type}|${s?.attributes?.entity_picture}`;
    for (const entity of this._watchedEntities) stKey += `|${entity}:${hass?.states[entity]?.state}`;
    if (stKey !== this._lastState) {
      this._lastState = stKey;
      this._evalVisible();
      if (this._config.auto_switch > 0) this._autoSwitch();
    }
    if (!this._rendered) this._render();
    else this._updateCard();
  }

  getCardSize() {
    // Return size in 50px units based on last known aspect ratio. Default to 4 until known.
    return Math.round((this._lastAspectPct ?? 100) / 100 * 4);
  }

  getGridOptions() {
    // Full-width, auto height, same as package-tracker-card, on request.
    return { columns: 'full', rows: 'auto' };
  }

  // ── Accessors ───────────────────────────────────────────────────────────────

  get _player()  { return this._config.players[this._playerIdx]?.entity ?? null; }
  get _state()   { return this._hass?.states[this._player] ?? null; }
  get _tr()      { return TRANSLATIONS[this._hass?.language] || TRANSLATIONS.en; }
  get _grouped() { return (this._attr('group_members')?.length ?? 0) > 1; }
  _attr(a)       { return this._state?.attributes?.[a] ?? null; }

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
    return p.name || _entityName(p.entity, this._hass);
  }
  _playerIcon(i) {
    const p = this._config.players[i];
    if (!p) return 'mdi:speaker-multiple';
    return this._hass?.states[p.entity]?.attributes?.icon
      || this._hass?.entities?.[p.entity]?.icon
      || 'mdi:speaker-multiple';
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

    // Evaluate player visibility conditions -- every player's own condition
    // first, in one pass, deciding whether to switch only afterward (found
    // live, 2026-07-30: deciding "first visible player" *inside* this same
    // loop, as this used to, could pick a player whose own visibility
    // hadn't been evaluated yet this same pass, wrongly treating its still-
    // undefined cache entry as "visible". With several players invisible at
    // once (e.g. 3 of 5), that could cascade through multiple wrong
    // _switchPlayer() calls, each recursing back into this same method,
    // before finally landing on a genuinely visible one -- all of it before
    // the very first render, where _switchPlayer()'s own _updateCard() call
    // is a no-op (nothing's been rendered yet to update), making the whole
    // multi-hop detour pure, easy-to-get-wrong overhead instead of a
    // correctness requirement).
    this._config.players.forEach((p, i) => {
      if (!p.visibility) return;
      const visible = this._evalConditions(p.visibility, p.entity);
      if (this._playerVisibleCache.get(i) !== visible) {
        this._playerVisibleCache.set(i, visible);
        pillChanged = true;
      }
    });
    let deferredSwitch = -1;
    if (this._playerVisibleCache.get(this._playerIdx) === false) {
      const first = this._config.players.findIndex((_, j) =>
        this._playerVisibleCache.get(j) !== false
      );
      if (first !== -1 && first !== this._playerIdx) deferredSwitch = first;
    }
    if (deferredSwitch !== -1) { this._switchPlayer(deferredSwitch); return; }

    if (!this._rendered) return;
    const st = this._state?.state;
    const { mainControls } = this._el;
    if (btnChanged && mainControls)
      mainControls.innerHTML = this._activeButtonsMemo().map(b => this._btnHtml(b, st)).join('');
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

  _showOverlayEls() {
    this._el?.overlayBg?.classList.add('visible');
    this._el?.overlay?.classList.add('visible');
  }
  _hideOverlayEls() {
    this._el?.overlayBg?.classList.remove('visible');
    this._el?.overlay?.classList.remove('visible');
  }

  _showCtrl() {
    this._ctrlVis = true;
    this._showOverlayEls();
    if (this._config.auto_hide !== false) this._scheduleHide();
  }
  _hideCtrl() {
    this._ctrlVis = false;
    this._hideOverlayEls();
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
  }
  _scheduleHide() {
    const isActive = this._state?.state === 'playing';
    if (!isActive) return;
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => this._hideCtrl(), this._config.show_duration * 1000);
  }
  _toggleCtrl() {
    const isActive = this._state?.state === 'playing';
    if (!isActive) {
      // Overlay stays visible; pulse track info as feedback
      const ca = this._el?.centerArea;
      if (ca) {
        ca.classList.remove('pulse');
        void ca.offsetWidth; // force reflow to restart animation
        ca.classList.add('pulse');
        ca.addEventListener('animationend', () => ca.classList.remove('pulse'), { once: true });
      }
      return;
    }
    this._ctrlVis ? this._hideCtrl() : this._showCtrl();
  }

  _findPlayingPlayer() {
    return this._config.players.findIndex((p, i) =>
      i !== this._playerIdx &&
      this._playerVisibleCache.get(i) !== false &&
      this._hass?.states[p.entity]?.state === 'playing'
    );
  }

  _autoSwitch() {
    const currentPlaying = this._state?.state === 'playing';

    // Current player is playing; cancel everything, release cooldown
    if (currentPlaying) {
      clearTimeout(this._autoSwitchTimer);
      this._autoSwitchTimer    = null;
      this._autoSwitchCooldown = false;
      return;
    }

    // Manual switch cooldown active; do nothing
    if (this._autoSwitchCooldown) return;

    // Find first visible playing player that isn't current
    const playingIdx = this._findPlayingPlayer();

    // No playing player found; cancel pending switch
    if (playingIdx === -1) {
      clearTimeout(this._autoSwitchTimer);
      this._autoSwitchTimer = null;
      return;
    }

    // Initial load; switch immediately without delay
    if (this._initialLoad) {
      this._initialLoad = false;
      this._switchPlayer(playingIdx);
      return;
    }

    // Timer already running; let it finish
    if (this._autoSwitchTimer !== null) return;

    // Start delay timer
    this._autoSwitchTimer = setTimeout(() => {
      this._autoSwitchTimer = null;
      if (this._state?.state === 'playing') return;
      if (this._autoSwitchCooldown) return;
      const idx = this._findPlayingPlayer();
      if (idx !== -1) this._switchPlayer(idx);
    }, this._config.auto_switch * 1000);
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
    this._configError     = false;
    clearTimeout(this._volTimer);
    clearTimeout(this._hideTimer);
    this._hideTimer       = null;
    this._groupExpect     = null;
    clearTimeout(this._groupTimer);
    clearTimeout(this._autoSwitchTimer);
    this._autoSwitchTimer    = null;
    this._visibleCache.clear();
    this._playerVisibleCache.clear();
    this._pending         = {};
    this._lastIconIdx     = -1;
    this._lastArtBase     = null;  // null forces clear on first _updateCard after switch
    this._lastHasArt      = null;
    this._lastAspectPct   = null;
    this._lastTrackKey    = null;
    this._lastBtnStateKey = null;
    this._lastContentType = null;
    this._lastPillKey     = null;
    this._lastArtStyle    = null;
    this._lastBlurVisible = null;
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
      return members.length > 1 ? [...members].sort().join(',') : null;
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

      // Sort cluster so coordinator (first in group_members) comes first
      let sortedCluster = cluster;
      if (grouped) {
        const firstState = this._hass?.states[this._config.players[cluster[0]]?.entity];
        const coordinator = firstState?.attributes?.group_members?.[0];
        if (coordinator) {
          const coordIdx = cluster.find(i => this._config.players[i]?.entity === coordinator);
          if (coordIdx !== undefined && coordIdx !== cluster[0]) {
            sortedCluster = [coordIdx, ...cluster.filter(i => i !== coordIdx)];
          }
        }
      }

      if (grouped) parts.push('<div class="pill-cluster">');

      sortedCluster.forEach((i, ci) => {
        const p           = this._config.players[i];
        const state       = this._hass?.states[p.entity];
        const unavailable = !state || state.state === 'unavailable';
        const active      = i === this._playerIdx;
        const isCoord     = grouped && ci === 0;
        const classes     = ['player-pill', active && 'active', unavailable && 'unavailable'].filter(Boolean).join(' ');
        const icon        = unavailable ? 'mdi:help-circle-outline' : this._playerIcon(i);

        // Only show extra member label on solo pills; cluster already shows grouping visually
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
              .map(e => _entityName(e, this._hass));
            if (extra.length === 1) pillLabel += ' (+ ' + extra[0] + ')';
            else if (extra.length > 1) pillLabel += ' (+ ' + extra.length + ')';
          }
        }

        const isPlaying = this._hass?.states[p.entity]?.state === 'playing';
        const showEq    = isPlaying && (!grouped || ci === 0);
        const iconHtml  = showEq
          ? '<div class="eq"><span></span><span></span><span></span></div>'
          : (isCoord || !grouped ? `<ha-icon icon="${icon}"></ha-icon>` : '');
        parts.push(`<button class="${classes}" data-index="${i}">
          ${iconHtml}
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
      const _sub = this._grouped ? `${this._tr.volume} · ${this._playerName(this._playerIdx)}` : '';
      this._flashStatus(delta > 0 ? this._tr.volume_up_flash : this._tr.volume_down_flash, _sub, 1);
    }
  }
  _flashStatus(title, sub, priority = 1, duration = STATUS_MS) {
    if (this._showVol && priority < this._statusPriority) return;
    this._showVol        = true;
    this._statusPriority = priority;
    // Show overlay without restarting auto-hide timer; that restarts after flash ends
    this._ctrlVis = true;
    this._showOverlayEls();
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
    const tr  = this._tr;
    const sub = this._grouped ? `${tr.volume} · ${this._playerName(this._playerIdx)}` : tr.volume;
    this._flashStatus(`${Math.round(level * 100)}%`, sub, 1);
  }

  _fireCustom(ci) {
    if (!this._hass) return;
    const player  = this._config.players[this._playerIdx];
    const buttons = player?.buttons ?? this._config.buttons;
    const customs = buttons.filter(b => b && typeof b === 'object' && !b._disabled);
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
    const tr      = this._tr;
    const player  = this._config.players[this._playerIdx];
    const members = player?.group_members ?? [];
    if (!members.length && !this._grouped) return;
    const grouped = this._grouped;

    // Build a readable list; use configured name if available, else friendly_name
    const allEntities = grouped
      ? (this._attr('group_members') ?? [])
      : [this._player, ...members];
    const memberNames = allEntities
      .map(e => {
        const idx = this._config.players.findIndex(p => p.entity === e);
        return idx !== -1 ? this._playerName(idx) : _entityName(e, this._hass);
      })
      .join(' · ');

    if (grouped) {
      this._hass.callService('media_player', 'unjoin', {}, { entity_id: this._player });
      this._groupExpect = false;
      this._flashStatus(tr.ungrouping, memberNames, 2, 9000);
    } else {
      this._hass.callService('media_player', 'join',
        { group_members: members }, { entity_id: this._player });
      this._groupExpect = true;
      this._flashStatus(tr.grouping, memberNames, 2, 9000);
    }
    clearTimeout(this._groupTimer);
    this._groupTimer = setTimeout(() => {
      if (this._groupExpect === null) return; // already resolved
      this._flashStatus(this._groupExpect ? tr.grouping_failed : tr.ungroup_failed, memberNames, 2, 2500);
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

  // _evalVisible() and _updateCard() can each decide to rebuild the button
  // row within the same hass tick; memoize so that only computes _activeButtons()
  // once per tick instead of twice. Cache is cleared at the top of set hass().
  _activeButtonsMemo() {
    if (!this._activeButtonsCache) this._activeButtonsCache = this._activeButtons();
    return this._activeButtonsCache;
  }

  _activeButtons() {
    const st          = this._state?.state;
    const isOff       = st === 'off';
    const supported   = this._attr('supported_features') ?? 0;
    const contentType = this._attr('media_content_type') ?? '';
    const isLive      = LIVE_TYPES.has(contentType);
    const player      = this._config.players[this._playerIdx];
    const buttons     = player?.buttons ?? this._config.buttons;
    const result = [];
    let ci = 0;
    if (st === 'unavailable' || st === 'unknown' || !st) return result;
    buttons.forEach((item, idx) => {
      if (item?._disabled) return;
      const key = typeof item === 'string' ? item : null;
      if (key) {
        const def = BUTTON_DEFS[key];
        if (!def) return;
        if (isOff && key !== 'power') return;
        if (key === 'group') {
          const alreadyGrouped = this._grouped;
          if (!player?.group_members?.length && !alreadyGrouped) return;
          // Skip feature check when group_members is configured; the F.GROUPING bit
          // is unreliable for some integrations (e.g. apple_tv / AirPlay).
          if (def.feature && (supported & def.feature) === 0 && !player?.group_members?.length) return;
        } else {
          // Hide shuffle and repeat for live/linear streams; feature bit may say
          // supported but the operation is meaningless on radio/channel/url content.
          if (isLive && (key === 'shuffle' || key === 'repeat')) return;
          if (def.feature && (supported & def.feature) === 0) return;
        }
        if (this._visibleCache.get(idx) === false) return;
        result.push({ key, ...def, label: this._tr['btn_' + key] ?? def.label });
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
                   ? this._grouped
                   : btn.toggleAttr
                   ? !!iconVal && iconVal !== 'off'
                   : false;
    return `<button class="ctrl-btn${btn.isPrimary ? ' play' : ''}${isActive ? ' active-toggle' : ''}"
      data-btn-key="${btn.key}" title="${btn.label}">${btn.icon(iconVal)}</button>`;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  _render() {
    this._ctrlVis         = false;
    this._lastFeats       = null;
    this._lastIsOff       = null;
    this._lastIsUnavail   = null;
    this._lastGrouped     = null;
    this._lastActive      = false;
    this._firstShow       = true;
    this._lastState       = null;
    this._showVol         = false;
    this._statusPriority  = 0;
    this._configError     = false;
    clearTimeout(this._pressTimer);
    clearTimeout(this._hideTimer);
    clearTimeout(this._volTimer);
    clearTimeout(this._groupTimer);
    clearTimeout(this._autoSwitchTimer);
    this._autoSwitchTimer    = null;
    clearTimeout(this._cooldownTimer);
    this._cooldownTimer      = null;
    this._initialLoad        = true;
    this._autoSwitchCooldown = false;
    this._groupExpect     = null;
    this._pending         = {};
    this._visibleCache.clear();
    this._playerVisibleCache.clear();
    this._lastPillKey     = null;
    this._lastTitle       = null;
    this._lastIconIdx     = -1;
    this._lastArtBase     = '';
    this._lastHasArt      = null;
    this._lastAspectPct   = null;
    this._lastTrackKey    = null;
    this._lastBtnStateKey = null;
    this._lastContentType = null;
    this._trackAnim       = null;
    this._lastArtStyle    = null;
    this._lastBlurVisible = null;
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
          font-family: var(--ha-font-family-body, inherit);
          -webkit-font-smoothing: var(--ha-font-smoothing, antialiased);
        }
        /* Aspect ratio wrapper: height driven by padding-bottom trick */
        .card-aspect {
          position: relative; width: 100%; padding-bottom: 100%;
          transition: padding-bottom .4s ease;
        }
        /* Everything inside is absolutely positioned within .card-aspect */
        .card-inner, .art-img, .overlay { position: absolute; inset: 0; }

        .art-blur {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          filter: blur(24px) brightness(0.6);
          transform: scale(1.08);
          opacity: 0; transition: opacity .6s ease;
        }
        .art-blur.loaded { opacity: 1; }

        .art-img {
          width: 100%; height: 100%;
          object-fit: cover; display: block; opacity: 0; transition: opacity .6s ease;
        }
        .art-img.loaded { opacity: 1; }
        .art-img.fit { object-fit: contain; }

        .art-placeholder {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
          background: var(--placeholder-bg);
          opacity: 1; transition: opacity .3s ease;
          padding: 24px; box-sizing: border-box;
        }
        .art-placeholder.hidden { opacity: 0; pointer-events: none; }
        .art-placeholder ha-icon {
          --mdc-icon-size: var(--placeholder-icon-size);
          color: rgba(255,255,255,.2);
        }

        /* ── Overlay ───────────────────────────────────── */
        .overlay-background {
          position: absolute; inset: 0;
          z-index: 10;
          background: transparent; opacity: 0;
          transition: opacity .3s ease, background .3s ease;
          pointer-events: none;
          display: var(--cover-media-overlay-display, block);
        }
        .overlay-background.visible { opacity: 1; background: var(--overlay-bg); }

        .overlay-content {
          position: absolute; inset: 0;
          z-index: 11;
          flex-direction: column;
          align-items: center; justify-content: space-between;
          padding: var(--overlay-padding-y) var(--overlay-padding-x);
          opacity: 0; transition: opacity .3s ease;
          pointer-events: none;
          display: var(--cover-media-overlay-display, flex);
        }
        .overlay-content.visible { opacity: 1; pointer-events: all; }

        .top-bar { width: 100%; display: flex; justify-content: center; }
        .player-pills { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; width: 100%; }
        .player-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px 6px 10px; border-radius: 999px; border: none;
          background: var(--pill-bg); color: rgba(255,255,255,0.7);
          font-family: inherit; font-size: 13px; /* deliberately off-scale, between --ha-font-size-s/m */
          font-weight: var(--ha-font-weight-medium, 500);
          cursor: pointer; white-space: nowrap;
          transition: background .2s, color .2s;
          max-width: calc(100% - var(--overlay-padding-x) * 2);
          flex: 0 0 auto;
        }
        .player-pill span { overflow: hidden; text-overflow: ellipsis; }
        .player-pill:hover  { background: rgba(255,255,255,0.22); color: #fff; }
        .player-pill.active { background: var(--pill-active-bg); color: var(--pill-active-color); box-shadow: 0 2px 8px rgba(0,0,0,.3); }
        .pill-cluster {
          display: flex; align-items: center; flex: 0 0 auto;
          border-radius: 999px;
          max-width: calc(100% - var(--overlay-padding-x) * 2);
          overflow: hidden;
        }
        .pill-cluster .player-pill { max-width: none; flex: 1 1 auto; min-width: 0; }
        .player-pill.unavailable { opacity: 0.45; }
        .player-pill.unavailable:hover { background: rgba(255,255,255,0.22); color: #fff; }
        .player-pill ha-icon { --mdc-icon-size: 16px; flex-shrink: 0; }
        .eq { display: inline-flex; align-items: center; justify-content: center; gap: 1.9px; height: 16px; width: 16px; flex-shrink: 0; vertical-align: middle; }
        .eq span { display: block; width: 2px; border-radius: 1px; background: currentColor; animation: eq-bar 3.2s ease-in-out infinite; }
        .eq span:nth-child(1) { animation-duration: 3.0s; animation-delay: 0.0s; }
        .eq span:nth-child(2) { animation-duration: 3.8s; animation-delay: 0.7s; }
        .eq span:nth-child(3) { animation-duration: 3.3s; animation-delay: 1.3s; }
        @keyframes eq-bar { 0%, 100% { height: 2px; } 50% { height: 9px; } }
        .pill-cluster .player-pill:not(:last-child) { border-radius: 999px 0 0 999px; }
        .pill-cluster .player-pill:not(:first-child) { border-radius: 0 999px 999px 0; }
        .pill-cluster .player-pill:not(:first-child):not(:last-child) { border-radius: 0; }

        .center-area {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; width: 100%; padding: 0 8px; text-align: center;
          transition: opacity .25s ease;
          flex: 1 1 0; min-height: 0; overflow: hidden; justify-content: center;
        }
        @keyframes ca-pulse { 0%,100% { opacity:1; } 50% { opacity:.45; } }
        .center-area.pulse { animation: ca-pulse .35s ease; }
        .track-title {
          font-size: clamp(var(--ha-font-size-xl, 20px), 6.5vw, var(--ha-font-size-3xl, 28px));
          font-weight: var(--ha-font-weight-bold, 700); color: #fff;
          text-shadow: 0 1px 8px rgba(0,0,0,.6); line-height: var(--ha-line-height-condensed, 1.2);
          word-break: break-word; max-width: 100%; overflow: hidden;
        }
        .track-artist {
          font-size: clamp(var(--ha-font-size-s, 12px), 3.5vw, var(--ha-font-size-l, 16px));
          color: rgba(255,255,255,.75);
          text-shadow: 0 1px 4px rgba(0,0,0,.5);
          word-break: break-word; max-width: 100%; overflow: hidden;
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
        .ctrl-btn.active-toggle { background: #fff; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,.3); }
        .ctrl-btn.active-toggle:hover { background: rgba(255,255,255,.9); }
        .ctrl-btn ha-icon { pointer-events: none; --mdc-icon-size: 20px; display: flex; }
      </style>

      <ha-card>
        <div class="card-aspect">
          <div class="card-inner" id="cardInner">

            <img class="art-blur" id="artBlur" src="" alt="" />
            <img class="art-img" id="artImg" src="" alt="" />
            <div class="art-placeholder" id="artPlaceholder">
              <ha-icon id="artPlaceholderIcon" icon="${this._playerIcon(this._playerIdx)}"></ha-icon>
            </div>

            <div class="overlay-background" id="overlayBg"></div>

            <div class="overlay-content" id="overlay">
              <div class="top-bar">
                ${multi ? `<div class="player-pills" id="playerPills"></div>` : ''}
              </div>

              <div class="center-area">
                <div class="track-title" id="trackTitle"></div>
                <div class="track-artist" id="trackArtist"></div>
              </div>

              <div class="controls-wrap">
                <div class="controls-row" id="mainControls">
                  ${this._activeButtonsMemo().map(b => this._btnHtml(b, st)).join('')}
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
    let _pressStartX = 0, _pressStartY = 0;
    inner.addEventListener('pointerdown', (e) => {
      _pressStartX = e.clientX;
      _pressStartY = e.clientY;
      if (e.target.closest('button')) return;
      this._pressTimer = setTimeout(() => {
        this._pressTimer = null;
        this.dispatchEvent(new CustomEvent('hass-more-info',
          { detail: { entityId: this._player }, bubbles: true, composed: true }));
      }, LONG_PRESS_MS);
    });
    const _cancelPress = () => { clearTimeout(this._pressTimer); this._pressTimer = null; };
    inner.addEventListener('pointerup',     _cancelPress);
    inner.addEventListener('pointermove',   (e) => {
      if (Math.abs(e.clientX - _pressStartX) > 10 || Math.abs(e.clientY - _pressStartY) > 10) _cancelPress();
    });
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
        this._autoSwitchCooldown = true;
        clearTimeout(this._autoSwitchTimer);
        this._autoSwitchTimer = null;
        clearTimeout(this._cooldownTimer);
        this._cooldownTimer = setTimeout(() => {
          this._autoSwitchCooldown = false;
          this._cooldownTimer = null;
        }, this._config.auto_switch * 1000);
        this._switchPlayer(parseInt(pill.dataset.index));
      });
    }

    const artImg    = this.shadowRoot.querySelector('#artImg');
    const artBlur   = this.shadowRoot.querySelector('#artBlur');
    const cardAspect = this.shadowRoot.querySelector('.card-aspect');
    artImg.addEventListener('load', () => {
      artImg.classList.add('loaded');
      this._applyAspectRatio(artImg, cardAspect);
      this._applyFitPadding();
    });
    artImg.addEventListener('error', () => artImg.classList.remove('loaded'));
    artBlur.addEventListener('load',  () => artBlur.classList.add('loaded'));
    artBlur.addEventListener('error', () => artBlur.classList.remove('loaded'));

    // Cache frequently-accessed DOM refs
    this._el = {
      artImg,
      artBlur,
      cardAspect,
      cardInner:        inner,
      haCard:           this.shadowRoot.querySelector('ha-card'),
      overlayBg:        this.shadowRoot.querySelector('#overlayBg'),
      overlay:          this.shadowRoot.querySelector('.overlay-content'),
      trackTitle:       this.shadowRoot.querySelector('#trackTitle'),
      trackArtist:      this.shadowRoot.querySelector('#trackArtist'),
      centerArea:       this.shadowRoot.querySelector('.center-area'),
      mainControls:     this.shadowRoot.querySelector('#mainControls'),
      artPlaceholder:     this.shadowRoot.querySelector('#artPlaceholder'),
      artPlaceholderIcon: this.shadowRoot.querySelector('#artPlaceholderIcon'),
    };
    // Only now, not at the top of _render(): _evalVisible()/_updateCard()
    // (called from later hass updates) destructure this._el without a
    // guard, unlike _applyFitPadding(). If _rendered were true before
    // this point and something upstream threw partway through _render(),
    // every later hass update would hit that unguarded destructure and
    // crash-loop instead of retrying a full _render().
    this._rendered = true;
    // Found live (2026-07-30, iOS companion app): the buttons row baked into
    // the shadowRoot.innerHTML above (via _activeButtonsMemo()) has no
    // fallback of its own -- it's a one-shot write, not a comparison against
    // a previous value the way every _updateCard() field is. If supported_
    // features/state genuinely aren't settled yet on this very first hass
    // push (plausible on a slower WebView, or when _evalVisible()/
    // _autoSwitch() switch players before _render() ever runs, since both
    // can fire earlier in the very same set hass() call, see their own
    // _switchPlayer() call sites), the initial buttons row can end up empty
    // and nothing re-checks it until a real state field actually changes.
    // Reconciling immediately here -- using this._lastFeats/etc, still null
    // from the reset above, so it always finds "changed" on the very first
    // pass -- fixes that same-tick instead of leaving it to chance on a
    // later one; harmless if the initial write was already correct.
    this._updateCard();
    this._applyDefaultRatio();

    // Recalculate fit sizing whenever the card is resized (e.g. in popups).
    // _render() reruns on every config change (unlike slideshow-card's
    // one-time setup), so the previous observer -- now watching a detached,
    // orphaned #cardInner from the just-replaced shadow DOM -- has to be
    // disconnected first, or it leaks one more dead observer on every edit.
    this._resizeObserver?.disconnect();
    if (window.ResizeObserver) {
      this._resizeObserver = new ResizeObserver(() => this._applyFitPadding());
      this._resizeObserver.observe(inner);
    }
  }

  // Shared by _applyAspectRatio/_applyDefaultRatio: sets the padding-bottom
  // that drives the card's aspect ratio, and fires card-size-changed only
  // when the effective percentage actually moved (so Lovelace's masonry
  // layout isn't asked to re-measure on every render).
  _setAspectPct(aspect, pct) {
    aspect.style.paddingBottom = `${pct.toFixed(2)}%`;
    if (pct !== this._lastAspectPct) {
      this._lastAspectPct = pct;
      this.dispatchEvent(new Event('card-size-changed', { bubbles: true, composed: true }));
    }
  }

  _applyAspectRatio(img, aspect) {
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return;
    const rawPct = (h / w) * 100;
    const minPct = _ratioPct(this._config.ratio_min);
    const maxPct = _ratioPct(this._config.ratio_max);
    const pct    = Math.min(maxPct, Math.max(minPct, rawPct));
    this._setAspectPct(aspect, pct);
  }

  _applyDefaultRatio() {
    const aspect = this._el?.cardAspect;
    if (!aspect) return;
    const minPct = _ratioPct(this._config.ratio_min);
    const maxPct = _ratioPct(this._config.ratio_max);
    const pct    = Math.min(maxPct, Math.max(minPct, 100));
    this._setAspectPct(aspect, pct);
  }

  /**
   * Fit mode only (fill mode clears this and lets .art-img's own CSS
   * object-fit:cover fill the whole card, same as before). Ported from
   * slideshow-card's identically-named method, adapted for a single image
   * (no crossfade-layer pair to keep in sync here).
   *
   * edge_to_edge:true (default) still explicitly sizes/positions the art
   * absolutely within #cardInner (padPx=0) rather than leaving it to plain
   * CSS inset:0 -- needed so the *pixel-accurate* centering math below
   * (which accounts for the image's real aspect ratio, not just
   * object-fit:contain's own centering) stays correct if edge_to_edge is
   * later toggled off without an intervening reload.
   *
   * edge_to_edge:false additionally applies a border radius (explicit
   * art_radius, or an auto value derived from ha-card's own corner radius)
   * and a drop shadow around the now-inset art.
   */
  _applyFitPadding() {
    const { cardInner, artImg, haCard } = this._el ?? {};
    if (!cardInner || !artImg) return;

    const isFit  = (this._config.art_style ?? 'fill') === 'fit';
    const noEdge = isFit && !(this._config.art_edge_to_edge ?? true);

    if (!isFit) {
      // Only clear fit-mode positioning properties, never opacity --
      // opacity is managed by the .art-img.loaded CSS transition.
      const FIT_PROPS = ['position', 'top', 'left', 'width', 'height',
                          'objectFit', 'borderRadius', 'boxShadow'];
      FIT_PROPS.forEach(p => { artImg.style[p] = ''; });
      return;
    }

    const cW = cardInner.offsetWidth;
    const cH = cardInner.offsetHeight;
    if (!cW || !cH || !artImg.naturalWidth || !artImg.naturalHeight) return;

    const padPx = noEdge ? Math.round(cW * (this._config.art_padding ?? 8) / 100) : 0;
    const aW    = cW - 2 * padPx;
    const aH    = cH - 2 * padPx;

    const ir = artImg.naturalWidth / artImg.naturalHeight;
    const rW = ir > aW / aH ? aW : Math.round(aH * ir);
    const rH = ir > aW / aH ? Math.round(aW / ir) : aH;

    // Centre within the padded area
    const left = padPx + Math.round((aW - rW) / 2);
    const top  = padPx + Math.round((aH - rH) / 2);

    let radius = '';
    let shadow = '';
    if (noEdge) {
      let r;
      if (this._config.art_radius != null) {
        r = this._config.art_radius;
      } else {
        const haRadius = haCard ? parseFloat(getComputedStyle(haCard).borderTopLeftRadius) || 0 : 0;
        r              = Math.min(haRadius + padPx * 0.15, 64);
      }
      radius = `${r}px`;
      shadow = '0 6px 24px rgba(0,0,0,.5)';
    }

    artImg.style.position     = 'absolute';
    artImg.style.left         = `${left}px`;
    artImg.style.top          = `${top}px`;
    artImg.style.width        = `${rW}px`;
    artImg.style.height       = `${rH}px`;
    artImg.style.objectFit    = 'fill';
    artImg.style.borderRadius = radius;
    artImg.style.boxShadow    = shadow;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  _updateTrackInfo() {
    if (this._showVol) return;
    if (this._configError) return;  // overlay already shows the error message
    const title    = this._attr('media_title') || '';
    const artist   = this._attr('media_artist') || this._attr('app_name') || '';
    const st       = this._state?.state;
    const stateLabel = (!title && !artist && st && st !== 'playing' && st !== 'paused')
      ? st.charAt(0).toUpperCase() + st.slice(1) : '';

    // title + artist → title / artist
    // artist only   → artist / (none)
    // no media      → player name / state label
    const display = title || artist || this._playerName(this._playerIdx);
    const sub     = title ? artist : (artist ? '' : stateLabel);
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

    if (this._trackAnim) { this._trackAnim.cancel(); this._trackAnim = null; }
    this._trackAnim = ca.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease' });
    this._trackAnim.onfinish = () => {
      write();
      this._trackAnim = ca.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
      this._trackAnim.onfinish = () => { this._trackAnim = null; };
    };
  }

  _updateConfigError() {
    const players = this._config.players;
    const tr      = this._tr;
    let title = '', sub = '';

    if (!players.length) {
      title = tr.error_no_player;
      sub   = tr.error_no_player_sub;
    } else {
      const missing = players.filter(p => p.entity && !this._hass?.states[p.entity]);
      if (missing.length === players.length) {
        title = missing.length === 1 ? tr.error_player_not_found : tr.error_players_not_found;
        sub   = missing.map(p => p.name || p.entity).join(', ');
      } else if (missing.length > 0) {
        title = tr.error_some_players_not_found;
        sub   = missing.map(p => p.name || p.entity).join(', ');
      }
    }

    const hasError = !!title;
    this._configError = hasError;

    // Reuse the normal overlay title/artist elements; same styling, same position
    if (hasError && !this._showVol) {
      if (this._el?.trackTitle)  this._el.trackTitle.textContent  = title;
      if (this._el?.trackArtist) {
        this._el.trackArtist.textContent   = sub;
        this._el.trackArtist.style.display = sub ? '' : 'none';
      }
      // Show overlay without starting auto-hide
      this._showOverlayEls();
    }

    // Keep placeholder icon visible; hide art
    if (this._el?.artPlaceholder) {
      this._el.artPlaceholder.classList.toggle('hidden', !hasError && !!this._lastArtBase);
    }
  }

  _updateCard() {
    if (!this._rendered) return;

    const st       = this._state?.state;
    const isActive = st === 'playing';
    // Ignore stale entity_picture when unavailable; HA keeps old value after disconnect
    const artUrl   = (st === 'unavailable' || st === 'unknown' || !st) ? null :
      this._attr('entity_picture') || _appLogoUrl(this._attr('app_name'));
    const title    = this._attr('media_title') || '';

    // ── Art ───────────────────────────────────────────────
    const { artImg, artBlur, cardAspect, mainControls, artPlaceholder, artPlaceholderIcon } = this._el;
    const artStyle = this._config.art_style ?? 'fill';
    const showBlur = artStyle === 'fit';

    // Apply fit/fill class
    if (artStyle !== this._lastArtStyle) {
      this._lastArtStyle = artStyle;
      artImg.classList.toggle('fit', artStyle === 'fit');
    }

    const artBase = artUrl?.includes('cache=') ? _cacheParam(artUrl) : artUrl;
    if (artUrl) {
      if (artBase !== this._lastArtBase) {
        this._lastArtBase = artBase;
        artImg.classList.remove('loaded');
        artBlur.classList.remove('loaded');
        artImg.src  = artUrl;
        artBlur.src = artUrl;
        // ratio applied on load event
      }
    } else {
      if (this._lastArtBase !== '') {
        this._lastArtBase = '';
        artImg.src  = '';
        artBlur.src = '';
        artImg.classList.remove('loaded');
        artBlur.classList.remove('loaded');
        this._applyDefaultRatio();
      }
    }

    // Show/hide blur layer
    const blurVisible = showBlur && !!artUrl;
    if (blurVisible !== this._lastBlurVisible) {
      this._lastBlurVisible = blurVisible;
      artBlur.style.display = blurVisible ? '' : 'none';
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

    this._updateConfigError();
    this._updateTrackInfo();

    // ── Group operation success detection ─────────────────────
    if (this._groupExpect !== null) {
      const grouped = this._grouped;
      if (grouped === this._groupExpect) {
        clearTimeout(this._groupTimer);
        this._groupExpect = null;
        const haMembers   = this._attr('group_members') ?? [];
        const successNames = (grouped ? haMembers : [this._player])
          .map(e => {
            const idx = this._config.players.findIndex(p => p.entity === e);
            return idx !== -1 ? this._playerName(idx) : _entityName(e, this._hass);
          })
          .join(' · ');
        this._flashStatus(grouped ? this._tr.grouped : this._tr.ungrouped, successNames, 2, 1500);
      }
    }

    // ── Rebuild buttons on feature, off/on, unavailable, grouped, or content type change ─────
    const feats       = this._attr('supported_features') ?? 0;
    const isOff       = st === 'off';
    const isUnavail   = st === 'unavailable' || st === 'unknown' || !st;
    const grouped     = this._grouped;
    const contentType = this._attr('media_content_type') ?? '';
    if (feats !== this._lastFeats || isOff !== this._lastIsOff || isUnavail !== this._lastIsUnavail || grouped !== this._lastGrouped || contentType !== this._lastContentType) {
      this._lastFeats       = feats;
      this._lastIsOff       = isOff;
      this._lastIsUnavail   = isUnavail;
      this._lastGrouped     = grouped;
      this._lastContentType = contentType;
      if (mainControls) mainControls.innerHTML = this._activeButtonsMemo().map(b => this._btnHtml(b, st)).join('');
    }

    // ── Update button icons + toggle states ─────────────────
    const shuffle    = this._toggleVal('shuffle');
    const repeat     = this._toggleVal('repeat');
    const btnStateKey = `${st}|${this._grouped}|${shuffle}|${repeat}`;
    if (btnStateKey !== this._lastBtnStateKey) {
      this._lastBtnStateKey = btnStateKey;
      this.shadowRoot.querySelectorAll('[data-btn-key]').forEach(btn => {
        const key = btn.dataset.btnKey;
        const def = BUTTON_DEFS[key];
        if (!def) return;
        if (key === 'group') {
          btn.classList.toggle('active-toggle', this._grouped);
        } else if (def.toggleAttr) {
          const val = this._toggleVal(def.toggleAttr);
          btn.classList.toggle('active-toggle', !!val && val !== 'off');
          btn.innerHTML = def.icon(val);
        } else if (key === 'play_pause') {
          btn.innerHTML = def.icon(st);
        }
        // previous, next, power, volume_up/down icons never change; skip
      });
    }

    // ── Controls visibility based on media state ─────────────
    if (!isActive) {
      clearTimeout(this._hideTimer);
      if (!this._ctrlVis) {
        this._ctrlVis = true;
        if (this._firstShow) {
          this._firstShow = false;
          requestAnimationFrame(() => this._showOverlayEls());
        } else {
          this._showOverlayEls();
        }
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

if (!customElements.get('cover-media-card')) {
  customElements.define('cover-media-card', CoverMediaCard);
}

window.customCards = window.customCards || [];
// Guarded like customElements.define above: a duplicate module load (HA
// resource cache-bust, dashboard resource re-added) would otherwise list
// this card twice in the card picker.
if (!window.customCards.some((c) => c.type === 'cover-media-card')) {
  window.customCards.push({
    type:             'cover-media-card',
    name:             'Cover Media Card',
    description:      'A cover art media player card with auto-hiding controls and multi-player switching.',
    preview:          true,
    documentationURL: 'https://github.com/klaptafel/ha-cover-media-card',
    version:          CARD_VERSION,
    getEntitySuggestion: (hass, entityId) => {
      if (!entityId.startsWith('media_player.')) return null;
      return { config: { type: 'custom:cover-media-card', players: [entityId] } };
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor
// ─────────────────────────────────────────────────────────────────────────────

const ALL_BUTTONS_INFO = [
  { key: 'volume_down', label: 'Volume down',  icon: 'mdi:volume-minus'     },
  { key: 'volume_up',   label: 'Volume up',    icon: 'mdi:volume-plus'      },
  { key: 'previous',    label: 'Previous',     icon: 'mdi:skip-previous'    },
  { key: 'play_pause',  label: 'Play / Pause', icon: 'mdi:play-pause'       },
  { key: 'next',        label: 'Next',         icon: 'mdi:skip-next'        },
  { key: 'shuffle',     label: 'Shuffle',      icon: 'mdi:shuffle'          },
  { key: 'repeat',      label: 'Repeat',       icon: 'mdi:repeat'           },
  { key: 'power',       label: 'Power',        icon: 'mdi:power'            },
  { key: 'group',       label: 'Group',        icon: 'mdi:speaker-multiple' },
];

class CoverMediaCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config         = null;
    this._hass           = null;
    this._built          = false;
    this._lastFiredConfig = null;
    this._tab            = 'players';
    this._playerExpanded = {};
    this._btnExpanded    = {};
  }

  get _tr() { return TRANSLATIONS[this._hass?.language] || TRANSLATIONS.en; }

  set hass(hass) {
    this._hass = hass;
    this.shadowRoot.querySelectorAll('ha-form').forEach(f => { f.hass = hass; });
  }

  setConfig(config) {
    if (!this._built) {
      this._config = _normalizeConfig(config);
      this._init();
      return;
    }
    // When the change came from our own _fire(), HA calls back with the stripped
    // config (no _disabled) -- possibly more than once per fire (confirmed: this
    // was the actual cause of numeric fields losing focus after one keystroke,
    // since a single-use `_ownFire` boolean only caught the *first* echo, letting
    // a second one slip through and destructively rebuild the just-focused
    // <ha-form>). Comparing directly against what we last actually dispatched
    // catches every echo, regardless of how many arrive or their timing --
    // don't overwrite our internal state (it has the full editor representation
    // including _disabled for correct drag-and-drop order) or re-render for any
    // of them.
    if (this._lastFiredConfig && deepEqual(config, this._lastFiredConfig)) return;
    this._config = _normalizeConfig(config);
    // While a field is actively focused, don't destructively rebuild the
    // tab (see the focusin/focusout listeners in _init()) -- accept the
    // echoed config into _config silently and let the next natural render
    // (blur, tab switch, add/delete) pick it up already up to date. This
    // covers echoes the deepEqual check above doesn't catch, without
    // needing to pin down exactly why a given round-trip didn't compare
    // equal.
    if (this._focusedInput) return;
    this._renderTab();
  }

  // ── Config output ──────────────────────────────────────────────────────────

  // Saves config to HA. Does NOT re-render; use for text inputs to preserve focus.
  _fire(config) {
    this._config = config;
    const cleanBtns = (btns) => (btns || []).filter(b => !b?._disabled);
    const clean = {
      ...config,
      buttons: cleanBtns(config.buttons),
      players: (config.players || []).map(p => {
        if (!p.buttons) return p;
        const cleaned = cleanBtns(p.buttons);
        const { buttons: _, ...rest } = p;
        return cleaned.length ? { ...rest, buttons: cleaned } : rest;
      }),
    };
    // Strip legacy aspect_ratio key
    delete clean.aspect_ratio;
    const stripped = stripDefaults(clean);
    // Enforce key order: players → buttons → settings (mirrors the GUI tab order).
    const KEY_ORDER = ['players', 'buttons',
      'ratio_min', 'ratio_max', 'art_style', 'art_edge_to_edge', 'art_padding', 'art_radius',
      'volume_step', 'auto_hide', 'show_duration', 'show_on_change', 'auto_switch'];
    const ordered = {};
    for (const k of KEY_ORDER)             if (k in stripped) ordered[k] = stripped[k];
    for (const k of Object.keys(stripped)) if (!(k in ordered)) ordered[k] = stripped[k];
    this._lastFiredConfig = ordered;
    this.dispatchEvent(new CustomEvent('config-changed',
      { detail: { config: ordered }, bubbles: true, composed: true }));
  }

  // Saves config and re-renders the current tab. Use for structural changes
  // (toggles that affect visible rows, delete, add, drag). Text inputs use _fire().
  _fireAndRender(config) {
    this._fire(config);
    this._renderTab();
  }

  // ── Shell (built once) ─────────────────────────────────────────────────────

  _init() {
    this._built = true;
    const root  = this.shadowRoot;

    // Tracks whether a text/number input somewhere in this editor (possibly
    // nested inside a <ha-form>'s own shadow root -- focusin/focusout are
    // composed and cross shadow boundaries) currently has focus. Used by
    // setConfig() to skip its destructive full re-render while the user is
    // actively typing: an echoed config-changed round-trip doesn't always
    // deep-equal exactly what we fired (e.g. after a host/YAML round-trip),
    // and rebuilding the whole tab from scratch on every keystroke replaces
    // the focused element, losing focus and cursor position.
    root.addEventListener('focusin',  () => { this._focusedInput = true; });
    root.addEventListener('focusout', () => { this._focusedInput = false; });

    root.appendChild(Object.assign(document.createElement('style'), { textContent: `
      :host { display: block; }
      ha-form { display: block; }

      /* ── Outer card ── */
      .editor-card {
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 12px);
        overflow: hidden;
        background: var(--ha-card-background, var(--card-background-color, #fff));
      }

      /* ── Tab bar ── */
      .tab-bar {
        display: flex;
        border-bottom: 1px solid var(--divider-color);
      }
      .tab-btn {
        flex: 1; padding: 12px 4px; border: none; background: none;
        font-family: inherit; font-size: 13px; font-weight: 500;
        color: var(--secondary-text-color); cursor: pointer;
        border-bottom: 2px solid transparent; margin-bottom: -1px;
        transition: color .15s, border-color .15s;
      }
      .tab-btn:hover  { color: var(--primary-text-color); }
      .tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }

      /* ── Tab content ── */
      .tab-content { padding: 20px 16px 16px; }

      /* ── Item list ── */
      .item-list { display: flex; flex-direction: column; gap: 8px; }

      /* ── Drop indicator ── */
      .drop-indicator {
        height: 2px; border-radius: 1px;
        background: var(--primary-color);
        pointer-events: none;
        margin: -1px 8px;
      }

      /* ── Drag ghost (touch) ── */
      .drag-ghost {
        position: fixed; pointer-events: none; z-index: 9999;
        opacity: .85; box-shadow: 0 4px 16px rgba(0,0,0,.2);
        border-radius: 8px; background: var(--ha-card-background, #fff);
        border: 1px solid var(--primary-color);
        transform: scale(1.02);
        transition: none;
      }

      /* ── Item entry (card) ── */
      .item-entry {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        overflow: hidden;
        transition: opacity .15s;
      }
      .item-entry.disabled-entry {
        background: var(--secondary-background-color, rgba(0,0,0,.03));
      }
      .item-entry.open-entry {
        border-color: var(--primary-color);
      }
      .item-entry.dragging { opacity: .3; }

      /* ── Item row ── */
      .item-row {
        display: flex; align-items: center; gap: 6px;
        min-height: 52px; padding: 0 12px 0 4px;
      }

      .drag-handle {
        display: flex; align-items: center; padding: 0 2px;
        color: var(--secondary-text-color); opacity: .4;
        cursor: grab; flex-shrink: 0;
      }
      .drag-handle:focus { outline: none; opacity: .8; }
      .drag-handle ha-icon { --mdc-icon-size: 18px; }

      .row-icon { --mdc-icon-size: 20px; flex-shrink: 0; width: 24px; color: var(--secondary-text-color); }
      .item-entry:not(.disabled-entry) .row-icon { color: var(--primary-text-color); }

      .row-label-wrap { flex: 1; min-width: 0; }
      .row-label {
        flex: 1; font-size: 14px; color: var(--secondary-text-color);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .item-entry:not(.disabled-entry) .row-label { color: var(--primary-text-color); }
      .row-sub { font-size: 11px; color: var(--secondary-text-color); margin-top: 1px; opacity: .65; }

      .row-action {
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      ha-switch { flex-shrink: 0; }
      .expand-btn { --mdc-icon-button-size: 36px; --mdc-icon-size: 18px; color: var(--secondary-text-color); }
      .delete-btn { --mdc-icon-button-size: 36px; --mdc-icon-size: 18px; color: var(--secondary-text-color); }
      .delete-btn:hover { color: var(--error-color, #db4437); }

      /* ── Expanded body ── */
      .item-body { padding: 4px 12px 14px; }
      .body-label {
        font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        color: var(--secondary-text-color); margin: 16px 0 4px;
      }
      .body-label:first-child { margin-top: 8px; }
      .body-label-sub {
        font-size: 11px; color: var(--secondary-text-color); opacity: .7;
        margin: -2px 0 4px;
      }
      .btn-hint {
        font-size: 12px; color: var(--secondary-text-color);
        display: flex; align-items: center; gap: 4px; margin-top: 6px; opacity: .8;
      }
      .btn-hint ha-icon { --mdc-icon-size: 14px; }

      /* ── Add section ── */
      .add-section { margin-top: 16px; }
      .add-label {
        font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        color: var(--secondary-text-color); margin-bottom: 4px;
      }
      ha-button { display: block; }
      .empty-state { font-size: 13px; color: var(--secondary-text-color); margin: 0 0 16px; font-style: italic; }

      /* ── Settings ── */
      .section-label {
        font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        color: var(--secondary-text-color); margin: 28px 0 0;
      }
      .section-label:first-child { margin-top: 0; }
      .settings-group { margin-top: 8px; }
      .srow {
        display: flex; align-items: center; justify-content: space-between;
        min-height: 48px; padding: 4px 2px; border-bottom: 1px solid var(--divider-color);
      }
      .settings-group .srow:last-child,
      .settings-group .radio-group:last-child { border-bottom: none; }
      .srow.srow-disabled { opacity: .45; pointer-events: none; }
      .srow-text { flex: 1; }
      .srow-label { font-size: 14px; color: var(--primary-text-color); display: block; }
      .srow-desc  { font-size: 12px; color: var(--secondary-text-color); display: block; margin-top: 1px; }
      .radio-group { padding: 4px 2px 8px; border-bottom: 1px solid var(--divider-color); }

      /* ── Aspect ratio picker ── */
      .aspect-picker { display: flex; gap: 16px; align-items: flex-start; margin-top: 8px; }
      .aspect-row { display: flex; align-items: flex-start; gap: 12px; }
      .aspect-rect { position: absolute; border-radius: 3px; }
      .aspect-rect-outer { background: var(--primary-color); opacity: 0.2; }
      .aspect-rect-inner { background: var(--primary-color); opacity: 0.55; border-radius: 2px; }
      .aspect-dropdowns { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
      .aspect-select-wrap { display: flex; align-items: center; gap: 6px; }
      .aspect-select-label { font-size: 12px; color: var(--secondary-text-color); width: 28px; flex-shrink: 0; }
      .aspect-select {
        flex: 1; height: 32px; border-radius: 6px; min-width: 0;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color, rgba(0,0,0,.04));
        color: var(--primary-text-color);
        font-family: inherit; font-size: 13px; padding: 0 6px; cursor: pointer;
      }
      .aspect-select:focus { outline: 2px solid var(--primary-color); outline-offset: -1px; border-color: transparent; }

      /* ── Version link ── */
      .version-link {
        display: block; font-size: 11px; color: var(--secondary-text-color);
        text-decoration: none; text-align: center;
        padding: 10px 16px 12px;
        border-top: 1px solid var(--divider-color);
      }
      .version-link:hover { text-decoration: underline; }
    ` }));

    const card = document.createElement('div');
    card.className = 'editor-card';

    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    const tr = this._tr;
    [['players', tr.tab_players], ['buttons', tr.tab_buttons], ['settings', tr.tab_settings]].forEach(([id, label]) => {
      const btn = Object.assign(document.createElement('button'), {
        className:   'tab-btn' + (id === this._tab ? ' active' : ''),
        textContent: label,
      });
      btn.dataset.tab = id;
      btn.addEventListener('click', () => {
        if (this._tab === id) return;
        this._tab = id;
        tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
        this._renderTab();
      });
      tabBar.appendChild(btn);
    });
    card.appendChild(tabBar);

    this._content = document.createElement('div');
    this._content.className = 'tab-content';
    card.appendChild(this._content);

    card.appendChild(Object.assign(document.createElement('a'), {
      href:        'https://github.com/klaptafel/ha-cover-media-card',
      target:      '_blank',
      rel:         'noopener noreferrer',
      className:   'version-link',
      textContent: `Cover Media Card v${CARD_VERSION}`,
    }));

    root.appendChild(card);
    this._renderTab();
  }

  // ── Tab dispatch ───────────────────────────────────────────────────────────

  _renderTab() {
    this._content.innerHTML = '';
    // Trim expanded states to actual array lengths to avoid stale keys
    const playerCount = this._config.players.length;
    const btnCount    = this._config.buttons.length;
    Object.keys(this._playerExpanded).forEach(k => { if (parseInt(k) >= playerCount) delete this._playerExpanded[k]; });
    Object.keys(this._btnExpanded).forEach(k    => { if (parseInt(k) >= btnCount)    delete this._btnExpanded[k]; });
    if      (this._tab === 'players')  this._renderPlayers();
    else if (this._tab === 'buttons')  this._renderButtons();
    else                               this._renderSettings();
    if (this._hass) this.shadowRoot.querySelectorAll('ha-form').forEach(f => { f.hass = this._hass; });
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  _mkDragHandle() {
    const wrap = document.createElement('div');
    wrap.className = 'drag-handle';
    const ico = document.createElement('ha-icon');
    ico.setAttribute('icon', 'mdi:drag-vertical');
    wrap.appendChild(ico);
    return wrap;
  }

  _mkExpandBtn(isOpen) {
    const wrap = document.createElement('div');
    wrap.className = 'row-action';
    const btn = document.createElement('ha-icon-button');
    btn.className = 'expand-btn';
    const ico = document.createElement('ha-icon');
    ico.setAttribute('icon', isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down');
    btn.appendChild(ico);
    wrap.appendChild(btn);
    return { wrap, btn, ico };
  }

  _mkDeleteBtn(onClick) {
    const wrap = document.createElement('div');
    wrap.className = 'row-action';
    const btn = document.createElement('ha-icon-button');
    btn.className = 'delete-btn';
    const ico = document.createElement('ha-icon');
    ico.setAttribute('icon', 'mdi:delete-outline');
    btn.appendChild(ico);
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    wrap.appendChild(btn);
    return wrap;
  }

  // label: visible text. key: config key. rerender: call _fireAndRender instead of _fire.
  // description: helper text. disabled: greys out row. disabledReason: replaces description when disabled.
  _mkToggleRow(label, key, { defaultVal = true, rerender = false, description = null, disabled = false, disabledReason = null } = {}) {
    const row = document.createElement('div');
    row.className = 'srow' + (disabled ? ' srow-disabled' : '');

    const textWrap = document.createElement('div');
    textWrap.className = 'srow-text';
    textWrap.appendChild(Object.assign(document.createElement('span'), { className: 'srow-label', textContent: label }));
    const desc = disabled ? disabledReason : description;
    if (desc) {
      textWrap.appendChild(Object.assign(document.createElement('span'), { className: 'srow-desc', textContent: desc }));
    }
    row.appendChild(textWrap);

    const sw = document.createElement('ha-switch');
    sw.checked = !!(this._config[key] ?? defaultVal);
    if (disabled) {
      sw.setAttribute('disabled', '');
    } else {
      sw.addEventListener('change', () => {
        const cfg = { ...this._config, [key]: sw.checked };
        rerender ? this._fireAndRender(cfg) : this._fire(cfg);
      });
    }
    row.appendChild(sw);
    return row;
  }

  // label: visible text. description: optional helper text. disabled: greys out row.
  // Generic ha-form row for editor fields; HA-native rendering/validation
  // via the selector object (number/select/text/...) instead of hand-built
  // inputs. Same pattern as notify-dashboard-card.js's _mkFormRow.
  _mkFormRow(label, selector, value, onChange, { description = null, disabled = false, disabledReason = null } = {}) {
    const row = document.createElement('div');
    row.className = 'srow' + (disabled ? ' srow-disabled' : '');

    const textWrap = document.createElement('div');
    textWrap.className = 'srow-text';
    textWrap.appendChild(Object.assign(document.createElement('span'), { className: 'srow-label', textContent: label }));
    const desc = disabled ? disabledReason : description;
    if (desc) {
      textWrap.appendChild(Object.assign(document.createElement('span'), { className: 'srow-desc', textContent: desc }));
    }
    row.appendChild(textWrap);

    const form = document.createElement('ha-form');
    form.schema = [{ name: 'v', selector }];
    form.data = { v: value };
    form.computeLabel = () => '';
    form.disabled = disabled;
    form.style.cssText = 'flex-shrink:0; width:120px;';
    if (this._hass) form.hass = this._hass;
    if (!disabled) {
      form.addEventListener('value-changed', (e) => {
        const val = e.detail.value?.v;
        if (val !== undefined) onChange(val);
      });
    }
    row.appendChild(form);
    return row;
  }

  // label: visible text. description: optional helper text. disabled: greys out row.
  _mkNumberRow(label, key, min, max, unit, defaultVal, description = null, opts = {}) {
    return this._mkFormRow(
      label,
      { number: { min, max, step: 1, mode: 'box', unit_of_measurement: unit } },
      this._config[key] ?? defaultVal,
      // val !== '' (not Number(val) || defaultVal): a legitimately-entered
      // 0 is falsy and would otherwise get silently replaced by the
      // default -- this bit art_padding specifically, whose min is 0.
      (val) => this._fire({ ...this._config, [key]: val !== '' ? Number(val) : defaultVal }),
      { description, ...opts },
    );
  }

  // ha-form + a `select` selector in `mode: 'list'` renders as a radio-button
  // list, same look as a hand-built <ha-radio-group>/<ha-radio-option> pair --
  // but going through ha-form means those two underlying custom elements are
  // guaranteed registered (ha-selector-select.ts imports them itself), which
  // a raw, hand-constructed <ha-radio-group> is not: HA only actually loads
  // that module when something renders a select-type ha-form field, so a
  // custom card creating the tags directly can end up with unregistered,
  // inert elements -- confirmed live (customElements.get('ha-radio-option')
  // returning undefined) as the real cause of the picker sometimes/always
  // rendering with visible text but no radio control at all.
  _mkSelectRow(label, key, options, { rerender = false } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'radio-group';

    const form = document.createElement('ha-form');
    form.schema = [{ name: 'v', selector: { select: { mode: 'list', options } } }];
    form.data = { v: this._config[key] ?? options[0].value };
    form.computeLabel = () => label;
    if (this._hass) form.hass = this._hass;
    form.addEventListener('value-changed', (e) => {
      const val = e.detail.value?.v;
      if (val === undefined || val === this._config[key]) return;
      const cfg = { ...this._config, [key]: val };
      rerender ? this._fireAndRender(cfg) : this._fire(cfg);
    });

    wrap.appendChild(form);
    return wrap;
  }

  // ── Aspect ratio picker ───────────────────────────────────────────────────

  _mkAspectPicker() {
    const tr = this._tr;
    const RATIOS = [
      { value: '16:9' }, { value: '3:2' }, { value: '4:3' },
      { value: '5:4' }, { value: '1:1' }, { value: '4:5' },
      { value: '3:4' }, { value: '2:3' }, { value: '9:16' },
    ];

    const minVal = this._config.ratio_min;
    const maxVal = this._config.ratio_max;
    const minPct = _ratioPct(minVal);
    const maxPct = _ratioPct(maxVal);

    const wrap = document.createElement('div');
    wrap.className = 'aspect-picker';

    // ── Preview ──
    const BASE        = 48;
    const CONTAINER_H = Math.round(BASE * _ratioPct('9:16') / 100);
    const preview     = document.createElement('div');
    preview.style.cssText = `position:relative;flex-shrink:0;width:${BASE}px;height:${CONTAINER_H}px;`;

    const outerH = Math.round(BASE * maxPct / 100);
    const innerH = Math.round(BASE * minPct / 100);
    const outer  = Object.assign(document.createElement('div'), { className: 'aspect-rect aspect-rect-outer' });
    outer.style.cssText = `top:0;left:0;width:${BASE}px;height:${outerH}px;`;
    const inner  = Object.assign(document.createElement('div'), { className: 'aspect-rect aspect-rect-inner' });
    inner.style.cssText = `top:0;left:0;width:${BASE}px;height:${innerH}px;`;
    preview.append(outer, inner);

    const row = document.createElement('div');
    row.className = 'aspect-row';
    row.appendChild(preview);

    // ── Dropdowns ──
    const dropdowns = document.createElement('div');
    dropdowns.className = 'aspect-dropdowns';

    // Deliberately native <select> instead of ha-form's select selector: this
    // dropdown pair is tightly coupled to the live rectangle preview above
    // (outer/inner sizing reacts to the selected ratio), which ha-form's
    // generic rendering doesn't support.
    const mkSelect = (labelText, key, filterFn) => {
      const selectWrap = document.createElement('div');
      selectWrap.className = 'aspect-select-wrap';
      selectWrap.appendChild(Object.assign(document.createElement('span'), {
        className: 'aspect-select-label', textContent: labelText,
      }));
      const sel = document.createElement('select');
      sel.className = 'aspect-select';
      RATIOS.filter(r => filterFn(r.value)).forEach(opt => {
        const o = Object.assign(document.createElement('option'), {
          value: opt.value, textContent: opt.value,
        });
        if (opt.value === this._config[key]) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        let cfg = { ...this._config, [key]: sel.value };
        // Auto-correct: min can never be more portrait than max
        if (_ratioPct(cfg.ratio_min) > _ratioPct(cfg.ratio_max)) {
          if (key === 'ratio_min') cfg.ratio_max = sel.value;
          else                     cfg.ratio_min = sel.value;
        }
        this._fireAndRender(cfg);
      });
      selectWrap.appendChild(sel);
      return selectWrap;
    };

    dropdowns.appendChild(mkSelect(tr.aspect_min, 'ratio_min', v => _ratioPct(v) <= maxPct));
    dropdowns.appendChild(mkSelect(tr.aspect_max, 'ratio_max', v => _ratioPct(v) >= minPct));
    row.appendChild(dropdowns);
    wrap.appendChild(row);
    return wrap;
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  _remapExpanded(expandedObj, from, to) {
    const next = {};
    Object.entries(expandedObj).forEach(([k, v]) => {
      const i = parseInt(k);
      if      (i === from)                        next[to]    = v;
      else if (from < to && i > from && i <= to)  next[i - 1] = v;
      else if (from > to && i >= to  && i < from) next[i + 1] = v;
      else                                        next[i]     = v;
    });
    return next;
  }

  _shiftExpanded(expandedObj, removedIdx) {
    const next = {};
    Object.entries(expandedObj).forEach(([k, v]) => {
      const i = parseInt(k);
      if      (i < removedIdx) next[i]     = v;
      else if (i > removedIdx) next[i - 1] = v;
    });
    return next;
  }

  // Unified drag-and-drop for both mouse (HTML5 drag) and touch.
  // Touch uses a fixed-position ghost clone that follows the finger.
  // The drop indicator is a real DOM element inserted between entries.
  _addDragDrop(list, getItems, expandedProp, onReorder) {
    let dragIdx    = null;
    let lastBefore = undefined;
    let ghost      = null;
    let ghostOffX  = 0;
    let ghostOffY  = 0;

    const indicator = Object.assign(document.createElement('div'), { className: 'drop-indicator' });
    const ents      = () => [...list.querySelectorAll(':scope > .item-entry')];
    const clearDrag = () => ents().forEach(e => e.classList.remove('dragging'));
    const removeInd = () => { indicator.remove(); lastBefore = undefined; };

    const showAt = (before) => {
      if (lastBefore === before) return;
      lastBefore = before;
      before ? list.insertBefore(indicator, before) : list.appendChild(indicator);
    };

    // Finds the entry before which the indicator should appear, based on clientY.
    const indicatorTarget = (clientY) => {
      let before = null;
      for (const ent of ents()) {
        const r = ent.getBoundingClientRect();
        if (clientY < r.top + r.height / 2) { before = ent; break; }
      }
      return before;
    };

    // Commits the drop using the current indicator position.
    const commitDrop = () => {
      if (dragIdx === null) return;
      const children = [...list.children];
      const indPos   = children.indexOf(indicator);
      if (indPos === -1) { dragIdx = null; return; }
      let to = ents().filter(en => children.indexOf(en) < indPos).length;
      removeInd(); clearDrag();
      if (dragIdx < to) to--;
      if (to !== dragIdx) {
        const items = [...getItems()];
        const [moved] = items.splice(dragIdx, 1);
        items.splice(to, 0, moved);
        this[expandedProp] = this._remapExpanded(this[expandedProp], dragIdx, to);
        const from = dragIdx;
        dragIdx = null;
        onReorder(items);
        return;
      }
      dragIdx = null;
    };

    // ── Mouse (HTML5 drag) ──────────────────────────────────────────────────

    ents().forEach((entry, idx) => {
      entry.setAttribute('draggable', 'true');
      entry.addEventListener('dragstart', (e) => {
        dragIdx = idx;
        e.dataTransfer.effectAllowed = 'move';
        requestAnimationFrame(() => entry.classList.add('dragging'));
      });
      entry.addEventListener('dragend', () => { dragIdx = null; removeInd(); clearDrag(); });

      // Keyboard reordering via ArrowUp / ArrowDown on the drag handle
      const handle = entry.querySelector('.drag-handle');
      if (handle) {
        handle.setAttribute('tabindex', '0');
        handle.setAttribute('role', 'button');
        handle.setAttribute('aria-label', this._tr.drag_to_reorder);
        handle.addEventListener('keydown', (e) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          const allEnts = ents();
          const to = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
          if (to < 0 || to >= allEnts.length) return;
          const items = [...getItems()];
          [items[idx], items[to]] = [items[to], items[idx]];
          this[expandedProp] = this._remapExpanded(this[expandedProp], idx, to);
          onReorder(items);
          // Re-focus the handle at its new position after re-render
          requestAnimationFrame(() => {
            const newEnts = list.querySelectorAll(':scope > .item-entry');
            newEnts[to]?.querySelector('.drag-handle')?.focus();
          });
        });
      }
    });

    list.addEventListener('dragover', (e) => {
      if (dragIdx === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      showAt(indicatorTarget(e.clientY));
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      commitDrop();
    });

    // ── Touch ───────────────────────────────────────────────────────────────

    // Only attach touch listeners to the drag handle so normal scrolling is
    // unaffected when the user touches anywhere else on the entry.
    ents().forEach((entry, idx) => {
      const handle = entry.querySelector('.drag-handle');
      if (!handle) return;

      handle.addEventListener('touchstart', (e) => {
        // Don't steal scroll; only activate on the handle itself
        const touch = e.touches[0];
        dragIdx = idx;
        entry.classList.add('dragging');

        // Build a ghost clone that follows the finger
        const rect = entry.getBoundingClientRect();
        ghostOffX  = touch.clientX - rect.left;
        ghostOffY  = touch.clientY - rect.top;

        ghost = entry.cloneNode(true);
        ghost.className = 'drag-ghost';
        ghost.style.width  = rect.width + 'px';
        ghost.style.left   = (touch.clientX - ghostOffX) + 'px';
        ghost.style.top    = (touch.clientY - ghostOffY) + 'px';
        // Render ghost in the host document, not inside the shadow root,
        // so it can overlay everything.
        document.body.appendChild(ghost);

        showAt(indicatorTarget(touch.clientY));
        e.preventDefault();
      }, { passive: false });

      handle.addEventListener('touchmove', (e) => {
        if (dragIdx === null) return;
        const touch = e.touches[0];
        if (ghost) {
          ghost.style.left = (touch.clientX - ghostOffX) + 'px';
          ghost.style.top  = (touch.clientY - ghostOffY) + 'px';
        }
        showAt(indicatorTarget(touch.clientY));
        e.preventDefault();
      }, { passive: false });

      handle.addEventListener('touchend', () => {
        if (ghost) { ghost.remove(); ghost = null; }
        commitDrop();
      });

      handle.addEventListener('touchcancel', () => {
        if (ghost) { ghost.remove(); ghost = null; }
        dragIdx = null; removeInd(); clearDrag();
      });
    });
  }

  // ── Players tab ────────────────────────────────────────────────────────────

  _renderPlayers() {
    const root    = this._content;
    const tr      = this._tr;
    const players = this._config.players;
    const save    = (updated) => this._fireAndRender({ ...this._config, players: updated });

    if (!players.length) {
      root.appendChild(Object.assign(document.createElement('p'), {
        className:   'empty-state',
        textContent: tr.no_players_configured,
      }));
    }

    const list = document.createElement('div');
    list.className = 'item-list';

    players.forEach((player, idx) => {
      const isOpen = !!this._playerExpanded[idx];
      const entry  = document.createElement('div');
      entry.className = 'item-entry' + (isOpen ? ' open-entry' : '');

      const row = document.createElement('div');
      row.className = 'item-row';

      const icon = document.createElement('ha-icon');
      icon.className = 'row-icon';
      icon.setAttribute('icon',
        this._hass?.states[player.entity]?.attributes?.icon ||
        this._hass?.entities?.[player.entity]?.icon || 'mdi:speaker'
      );

      const labelWrap = document.createElement('div');
      labelWrap.className = 'row-label-wrap';
      labelWrap.appendChild(Object.assign(document.createElement('div'), {
        className: 'row-label', textContent: player.name || _entityName(player.entity, this._hass),
      }));
      labelWrap.appendChild(Object.assign(document.createElement('div'), {
        className: 'row-sub', textContent: player.entity,
      }));

      const { wrap: expandWrap, btn: expandBtn, ico: expandIco } = this._mkExpandBtn(isOpen);
      const deleteWrap = this._mkDeleteBtn(() => {
        this._playerExpanded = this._shiftExpanded(this._playerExpanded, idx);
        save(players.filter((_, j) => j !== idx));
      });

      row.append(this._mkDragHandle(), icon, labelWrap, expandWrap, deleteWrap);
      entry.appendChild(row);

      const body = document.createElement('div');
      body.className     = 'item-body';
      body.style.display = isOpen ? '' : 'none';

      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._playerExpanded[idx] = !this._playerExpanded[idx];
        const open = this._playerExpanded[idx];
        expandIco.setAttribute('icon', open ? 'mdi:chevron-up' : 'mdi:chevron-down');
        entry.classList.toggle('open-entry', open);
        body.style.display = open ? '' : 'none';
      });

      const mkLabel = (t) => Object.assign(document.createElement('div'), { className: 'body-label', textContent: t });

      // Entity: exclude other already-configured players
      const otherEntities = players.filter((_, j) => j !== idx).map(p => p.entity);
      const entityForm = document.createElement('ha-form');
      entityForm.schema = [{ name: 'entity', selector: { entity: {
        domain: 'media_player', exclude_entities: otherEntities,
      } } }];
      entityForm.data   = { entity: player.entity };
      entityForm.computeLabel = () => '';
      entityForm.addEventListener('value-changed', (e) => {
        const entity = e.detail.value.entity;
        if (!entity) return;
        const arr = [...players]; arr[idx] = { ...arr[idx], entity }; save(arr);
      });

      // Display name: _fire only (no re-render) to preserve focus; update row label live
      const nameForm = document.createElement('ha-form');
      nameForm.schema = [{ name: 'name', selector: { text: {} } }];
      nameForm.data   = { name: player.name || '' };
      nameForm.computeLabel = () => '';
      nameForm.addEventListener('value-changed', (e) => {
        const arr = [...players];
        arr[idx]  = { ...arr[idx] };
        const val = e.detail.value.name?.trim() || '';
        if (val) arr[idx].name = val; else delete arr[idx].name;
        const rowLabel = labelWrap.querySelector('.row-label');
        if (rowLabel) rowLabel.textContent = val || _entityName(player.entity, this._hass);
        this._fire({ ...this._config, players: arr });
      });

      // Group members: filter to players from the same integration, exclude own entity.
      // Falls back to all media_players if platform info is unavailable.
      const ownPlatform = this._hass?.entities?.[player.entity]?.platform;
      const alreadyConfigured = new Set(player.group_members || []);
      const groupCandidates = Object.keys(this._hass?.states ?? {}).filter(id => {
        if (!id.startsWith('media_player.') || id === player.entity) return false;
        if (alreadyConfigured.has(id)) return true;  // always include current selections
        if (!ownPlatform) return true;
        return this._hass?.entities?.[id]?.platform === ownPlatform;
      });
      const excludeFromGroup = Object.keys(this._hass?.states ?? {})
        .filter(id => id.startsWith('media_player.') && !groupCandidates.includes(id));
      const groupForm = document.createElement('ha-form');
      groupForm.schema = [{ name: 'group_members', selector: { entity: {
        multiple: true,
        domain: 'media_player',
        exclude_entities: excludeFromGroup,
      } } }];
      groupForm.data   = { group_members: player.group_members || [] };
      groupForm.computeLabel = () => '';
      groupForm.addEventListener('value-changed', (e) => {
        const arr = [...players];
        arr[idx]  = { ...arr[idx] };
        const val = e.detail.value.group_members || [];
        if (val.length) arr[idx].group_members = val; else delete arr[idx].group_members;
        save(arr);
      });

      const groupMembersLabel = document.createElement('div');
      groupMembersLabel.className = 'body-label';
      groupMembersLabel.textContent = tr.group_members;
      const groupMembersSub = Object.assign(document.createElement('div'), {
        className: 'body-label-sub',
        textContent: tr.group_members_desc,
      });

      body.append(
        mkLabel(tr.entity),       entityForm,
        mkLabel(tr.display_name), nameForm,
        groupMembersLabel, groupMembersSub, groupForm,
      );

      entry.appendChild(body);
      list.appendChild(entry);
    });

    root.appendChild(list);
    this._addDragDrop(list, () => this._config.players, '_playerExpanded',
      (reordered) => save(reordered));

    // ── Add player ──
    const addSection = document.createElement('div');
    addSection.className = 'add-section';
    addSection.appendChild(Object.assign(document.createElement('div'), {
      className: 'add-label', textContent: tr.add_player,
    }));
    const addForm = document.createElement('ha-form');
    addForm.schema = [{ name: 'entity', selector: { entity: {
      domain: 'media_player',
      exclude_entities: players.map(p => p.entity),
    } } }];
    addForm.data   = { entity: null };
    addForm.computeLabel = () => '';
    if (this._hass) addForm.hass = this._hass;
    addForm.addEventListener('value-changed', (e) => {
      const entity = e.detail.value.entity;
      if (!entity) return;
      addForm.data = { entity: null };
      save([...players, { entity }]);
    });
    addSection.appendChild(addForm);
    root.appendChild(addSection);
  }

  // ── Buttons tab ────────────────────────────────────────────────────────────

  _renderButtons() {
    const root      = this._content;
    const tr        = this._tr;
    const buttons   = this._config.buttons;
    const save      = (updated) => this._fireAndRender({ ...this._config, buttons: updated });
    const saveField = (updated) => this._fire({ ...this._config, buttons: updated });
    const list = document.createElement('div');    list.className = 'item-list';

    buttons.forEach((item, arrIdx) => {
      const entry = document.createElement('div');
      entry.className = 'item-entry';

      // ── Disabled builtin ──
      if (item?._disabled) {
        const key  = item._disabled;
        const info = ALL_BUTTONS_INFO.find(b => b.key === key);
        if (!info) return;
        if (key === 'group' && !this._config.players.some(p => p.group_members?.length)) return;

        entry.classList.add('disabled-entry');

        const row = document.createElement('div');
        row.className = 'item-row';

        const icon = document.createElement('ha-icon');
        icon.className = 'row-icon';
        icon.setAttribute('icon', info.icon);

        const label = Object.assign(document.createElement('span'), {
          className: 'row-label', textContent: tr['row_' + key] ?? info.label,
        });

        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'row-action';
        const toggle = document.createElement('ha-switch');
        toggle.checked = false;
        toggle.addEventListener('change', () => {
          const arr = [...buttons]; arr[arrIdx] = key; save(arr);
        });
        toggleWrap.appendChild(toggle);

        row.append(this._mkDragHandle(), icon, label, toggleWrap);
        entry.appendChild(row);
        list.appendChild(entry);
        return;
      }

      // ── Enabled builtin or custom ──
      const isBuiltin = typeof item === 'string';
      const info      = isBuiltin ? ALL_BUTTONS_INFO.find(b => b.key === item) : null;
      if (isBuiltin && item === 'group' && !this._config.players.some(p => p.group_members?.length)) return;

      const row = document.createElement('div');
      row.className = 'item-row';

      const icon = document.createElement('ha-icon');
      icon.className = 'row-icon';
      icon.setAttribute('icon', isBuiltin ? info.icon : (item.icon || 'mdi:gesture-tap-button'));

      const label = Object.assign(document.createElement('span'), {
        className:   'row-label',
        textContent: isBuiltin ? (tr['row_' + item] ?? info.label) : (item.label || item.tap_action?.perform_action || tr.custom_button_fallback),
      });

      row.append(this._mkDragHandle(), icon, label);

      if (isBuiltin) {
        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'row-action';
        const toggle = document.createElement('ha-switch');
        toggle.checked = true;
        toggle.addEventListener('change', () => {
          const arr = [...buttons]; arr[arrIdx] = { _disabled: item }; save(arr);
        });
        toggleWrap.appendChild(toggle);
        row.appendChild(toggleWrap);
        entry.appendChild(row);

      } else {
        // Custom button: expand + delete
        const isOpen = !!this._btnExpanded[arrIdx];
        if (isOpen) entry.classList.add('open-entry');
        const { wrap: expandWrap, btn: expandBtn, ico: expandIco } = this._mkExpandBtn(isOpen);
        const deleteWrap = this._mkDeleteBtn(() => {
          this._btnExpanded = this._shiftExpanded(this._btnExpanded, arrIdx);
          save(buttons.filter((_, j) => j !== arrIdx));
        });
        row.append(expandWrap, deleteWrap);

        const body = document.createElement('div');
        body.className     = 'item-body';
        body.style.display = isOpen ? '' : 'none';

        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._btnExpanded[arrIdx] = !this._btnExpanded[arrIdx];
          const open = this._btnExpanded[arrIdx];
          expandIco.setAttribute('icon', open ? 'mdi:chevron-up' : 'mdi:chevron-down');
          entry.classList.toggle('open-entry', open);
          body.style.display = open ? '' : 'none';
        });

        const mkLabel = (t) => Object.assign(document.createElement('div'), { className: 'body-label', textContent: t });

        // Two separate, single-field forms with minimal `data` (not the
        // whole button object) -- same pattern as the player name field
        // above. Passing item's full shape (including tap_action) as
        // ha-form's `data` was causing the label field to lose focus after
        // every keystroke; a minimal, schema-matching data object avoids it.
        const iconForm = document.createElement('ha-form');
        iconForm.className = 'btn-form';
        iconForm.schema    = [{ name: 'icon', selector: { icon: {} } }];
        iconForm.data         = { icon: item.icon || '' };
        iconForm.computeLabel = () => tr.field_icon;
        iconForm.addEventListener('value-changed', (e) => {
          const arr = [...buttons]; arr[arrIdx] = { ...arr[arrIdx], ...e.detail.value };
          icon.setAttribute('icon', arr[arrIdx].icon || 'mdi:gesture-tap-button');
          saveField(arr);
        });

        const labelForm = document.createElement('ha-form');
        labelForm.className = 'btn-form';
        labelForm.schema    = [{ name: 'label', selector: { text: {} } }];
        labelForm.data         = { label: item.label || '' };
        labelForm.computeLabel = () => tr.field_label_tooltip;
        labelForm.addEventListener('value-changed', (e) => {
          const arr = [...buttons]; arr[arrIdx] = { ...arr[arrIdx], ...e.detail.value };
          label.textContent = arr[arrIdx].label || arr[arrIdx].tap_action?.perform_action || tr.custom_button_fallback;
          saveField(arr);
        });

        const actionForm = document.createElement('ha-form');
        actionForm.className    = 'btn-form';
        actionForm.schema       = [{ name: 'tap_action', selector: { ui_action: {} } }];
        actionForm.data         = { tap_action: item.tap_action };
        actionForm.computeLabel = () => '';
        actionForm.addEventListener('value-changed', (e) => {
          const arr = [...buttons]; arr[arrIdx] = { ...arr[arrIdx], ...e.detail.value };
          label.textContent = arr[arrIdx].label || arr[arrIdx].tap_action?.perform_action || tr.custom_button_fallback;
          saveField(arr);
        });

        body.append(
          mkLabel(tr.button_header), iconForm, labelForm,
          mkLabel(tr.action_header), actionForm,
        );

        // Hint when no action has been configured yet
        if (!item.tap_action?.action || item.tap_action.action === 'none') {
          const hint = document.createElement('div');
          hint.className = 'btn-hint';
          const hIco = document.createElement('ha-icon');
          hIco.setAttribute('icon', 'mdi:information-outline');
          hint.append(hIco, Object.assign(document.createElement('span'), {
            textContent: tr.choose_action_hint,
          }));
          body.appendChild(hint);
        }

        entry.appendChild(row);
        entry.appendChild(body);
      }

      list.appendChild(entry);
    });

    root.appendChild(list);
    this._addDragDrop(list, () => this._config.buttons, '_btnExpanded',
      (reordered) => save(reordered));

    // ── Add custom button ──
    const addSection = document.createElement('div');
    addSection.className = 'add-section';
    const addBtn = document.createElement('ha-button');
    addBtn.textContent = tr.add_custom_button;
    addBtn.addEventListener('click', () => {
      const updated = [...buttons, { icon: 'mdi:information-outline', label: tr.default_custom_button_label, tap_action: { action: 'more-info' } }];
      this._btnExpanded[updated.length - 1] = true;
      save(updated);
    });
    addSection.appendChild(addBtn);
    root.appendChild(addSection);
  }

  // ── Settings tab ───────────────────────────────────────────────────────────

  _renderSettings() {
    const root     = this._content;
    const tr       = this._tr;
    const autoHide = this._config.auto_hide ?? true;
    const autoSw   = (this._config.auto_switch ?? 0) > 0;
    const multi    = this._config.players.length > 1;
    const hasVol   = this._config.buttons.some(b => {
      const k = typeof b === 'string' ? b : null;
      return k === 'volume_up' || k === 'volume_down';
    });

    // ── Aspect ratio ──
    root.appendChild(Object.assign(document.createElement('div'), { className: 'section-label', textContent: tr.section_aspect_ratio }));
    root.appendChild(this._mkAspectPicker());

    // ── Art ──
    const artStyle = this._config.art_style ?? 'fill';
    root.appendChild(Object.assign(document.createElement('div'), { className: 'section-label', textContent: tr.section_art }));
    const artGroup = document.createElement('div');
    artGroup.className = 'settings-group';
    artGroup.appendChild(this._mkSelectRow(tr.style, 'art_style', [
      { value: 'fill', label: tr.art_fill },
      { value: 'fit',  label: tr.art_fit },
    ], { rerender: true }));
    if (artStyle === 'fit') {
      artGroup.appendChild(this._mkToggleRow(tr.edge_to_edge, 'art_edge_to_edge', {
        defaultVal: true,
        rerender:   true,
      }));
      const noEdge = !(this._config.art_edge_to_edge ?? true);
      if (noEdge) {
        artGroup.appendChild(this._mkNumberRow(
          tr.padding, 'art_padding', 0, 30, '%', 8,
          null
        ));
      }
    }

    root.appendChild(artGroup);

    // ── General ──
    root.appendChild(Object.assign(document.createElement('div'), { className: 'section-label', textContent: tr.section_general }));
    const generalGroup = document.createElement('div');
    generalGroup.className = 'settings-group';
    generalGroup.appendChild(this._mkNumberRow(
      tr.volume_step, 'volume_step', 1, 50, '%', 2,
      tr.volume_step_desc,
      { disabled: !hasVol, disabledReason: tr.volume_step_disabled }
    ));
    root.appendChild(generalGroup);

    // ── Overlay ──
    root.appendChild(Object.assign(document.createElement('div'), { className: 'section-label', textContent: tr.section_overlay }));
    const overlayGroup = document.createElement('div');
    overlayGroup.className = 'settings-group';
    overlayGroup.appendChild(this._mkToggleRow(tr.auto_hide, 'auto_hide', {
      rerender:    true,
      description: tr.auto_hide_desc,
    }));
    overlayGroup.appendChild(this._mkNumberRow(
      tr.show_duration, 'show_duration', 1, 60, 's', 10,
      tr.show_duration_desc,
      { disabled: !autoHide, disabledReason: tr.overlay_disabled_reason }
    ));
    overlayGroup.appendChild(this._mkToggleRow(tr.show_on_change, 'show_on_change', {
      description:    tr.show_on_change_desc,
      disabled:       !autoHide,
      disabledReason: tr.overlay_disabled_reason,
    }));
    root.appendChild(overlayGroup);

    // ── Player switching ──
    root.appendChild(Object.assign(document.createElement('div'), { className: 'section-label', textContent: tr.section_player_switching }));
    const switchGroup = document.createElement('div');
    switchGroup.className = 'settings-group';

    const autoSwRow = document.createElement('div');
    autoSwRow.className = 'srow' + (!multi ? ' srow-disabled' : '');
    const autoSwText = document.createElement('div');
    autoSwText.className = 'srow-text';
    autoSwText.appendChild(Object.assign(document.createElement('span'), { className: 'srow-label', textContent: tr.auto_switch }));
    autoSwText.appendChild(Object.assign(document.createElement('span'), { className: 'srow-desc', textContent:
      multi ? tr.auto_switch_desc
            : tr.multi_required,
    }));
    autoSwRow.appendChild(autoSwText);
    const autoSwToggle = document.createElement('ha-switch');
    autoSwToggle.checked = autoSw;
    if (!multi) {
      autoSwToggle.setAttribute('disabled', '');
    } else {
      autoSwToggle.addEventListener('change', () => {
        this._fireAndRender({ ...this._config, auto_switch: autoSwToggle.checked ? 30 : 0 });
      });
    }
    autoSwRow.appendChild(autoSwToggle);
    switchGroup.appendChild(autoSwRow);

    switchGroup.appendChild(this._mkNumberRow(
      tr.delay, 'auto_switch', 1, 300, 's', 30,
      tr.delay_desc,
      { disabled: !multi || !autoSw, disabledReason: !multi ? tr.multi_required : tr.enable_auto_switch }
    ));
    root.appendChild(switchGroup);
  }
}

if (!customElements.get('cover-media-card-editor')) {
  customElements.define('cover-media-card-editor', CoverMediaCardEditor);
}

console.info(
  `%c COVER MEDIA CARD %c v${CARD_VERSION} `,
  'background:#111;color:#eee;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px',
  'background:#eee;color:#111;font-weight:700;padding:2px 6px;border-radius:0 3px 3px 0'
);

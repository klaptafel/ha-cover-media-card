# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Versions before 0.5.0 are not retroactively documented: see git history / GitHub releases for those.

## [Unreleased]

### Fixed
- The "Open your Home Assistant instance" HACS badge in the README used an invalid category (`dashboard`), which made the link error out; now uses `plugin`, the correct HACS category for a Lovelace card.
- `_mkNumberRow` treated an explicitly entered `0` (e.g. `art_padding: 0`) as falsy and silently substituted the field's default value instead.
- `_rendered` was set to `true` before the cached DOM references (`_el`) were actually populated; an exception partway through the first render could leave the card permanently crash-looping on every `hass` update instead of retrying a full render.

### Added
- `window.customCards` double-registration guard, matching the existing `customElements.define` guard.

### Changed
- The watched-entity list used to detect relevant `hass` changes is now built once in `setConfig()` instead of rebuilt on every `hass` update.
- `_activeButtons()` is now computed at most once per `hass` tick (previously could be computed twice, once via `_evalVisible()` and once via `_updateCard()`, if both triggered in the same tick).
- The overlay show/hide DOM-toggling repeated across `_showCtrl`/`_hideCtrl`/`_flashStatus`/`_updateConfigError`/`_updateCard` consolidated into shared `_showOverlayEls()`/`_hideOverlayEls()` helpers; no behavior change.

## [0.6.0] - 2026-07-13

This release is mostly polish: the card is now fully available in English and Dutch, and editor fields no longer lose focus while you're typing in them. Fit mode gains new options to inset the artwork with padding, rounded corners, and a soft shadow instead of always filling the card edge-to-edge. The card also now fits properly into Home Assistant's Sections dashboards (full width, automatic height).

### Added
- `CARD_DEFAULTS` + `stripDefaults()`/`deepEqual()` as the single source of truth for config defaults.
- Numeric editor fields (Volume step, Show duration, Delay) now use `ha-form` + a number selector instead of hand-built `ha-input`.
- Typography now uses HA's `--ha-font-*`/`--ha-line-height-*` tokens (with fallback values matching HA's actual token definitions) instead of hardcoded px values.
- `documentationURL`, `version`, and `getEntitySuggestion` added to `window.customCards.push`.
- Full EN/NL translations (77 keys) across the card and all three editor tabs.
- `getGridOptions()` for the Sections dashboard view: full-width, auto height (same as package-tracker-card).
- `art_edge_to_edge`/`art_padding`/`art_radius` config options for Fit mode (ported from slideshow-card, which already had them): set `art_edge_to_edge: false` to inset the art within the card instead of filling it edge-to-edge, with a configurable padding percentage, border radius (explicit, or auto-derived from the card's own corner radius), and drop shadow. Editor exposes an "Edge to edge" toggle and a conditional padding field under Fit mode; `art_radius` is YAML-only, matching slideshow-card's own convention.

### Changed
- Style picker migrated from the deprecated `ha-formfield`+`ha-radio` (removed in HA 2026.6) to `ha-form` with a `select` selector in `mode: 'list'` (renders as the same radio-button look). Going through `ha-form` rather than constructing `<ha-radio-group>`/`<ha-radio-option>` directly matters: those two custom elements are only actually *registered* by HA's frontend when something loads a module that imports them, which a hand-built element doesn't trigger on its own; `ha-form`'s own `select` selector does, since it imports them internally. A card creating the raw tags itself risks an inert, un-upgraded element (visible label text, no radio control, no error) if nothing else has loaded that registration first; confirmed live via `customElements.get('ha-radio-option')` returning `undefined`.
- Entity name display now prefers `hass.formatEntityName()` (registry-aware device+entity naming) with a fallback for older HA versions.
- Style picker options simplified to just "Fill"/"Fit" (Dutch: "Vullen"/"Passend"): the previous dash-separated explanation was redundant (both terms are self-explanatory, and the effect is visible immediately after selecting) and rendered as one long line of text in the radio option itself. The "Art" section is now labeled "Coverafbeelding" in Dutch instead of the awkward literal "Hoesart".
- README title given an SEO-friendly subtitle (": Home Assistant media player card"), matching the rest of this HACS collection.

### Fixed
- The editor's numeric and text `ha-form` fields (e.g. Volume step, a player's Display name) could lose focus after a single keystroke. Cause: `setConfig()`'s `_ownFire` guard was a single-use boolean cleared by the *first* matching echo of our own `config-changed`: if Lovelace called `setConfig()` back a second time for the same edit (confirmed happening in practice), that second echo wasn't caught and fell through to a full, destructive `_renderTab()`, tearing down the very `<ha-form>` the user was mid-keystroke in. Replaced with a content-based check: `_fire()` now remembers exactly what it last dispatched, and `setConfig()` compares the incoming config against that (via the existing `deepEqual()`) instead of relying on a single-use flag; every echo is caught, regardless of how many arrive.

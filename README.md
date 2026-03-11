[![Made for Home Assistant](https://img.shields.io/badge/Made%20for-Home%20Assistant-blue?style=for-the-badge&logo=homeassistant)](https://www.home-assistant.io/)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)

# Cover Media Card

A cinematic media player card for Home Assistant Lovelace. Displays cover art full-bleed with auto-hiding controls, multi-player switching, and a fully GUI-configurable button row.

> ℹ️ **Screenshot coming soon**

---

## Features

- **Full cover art background** — artwork fills the card, aspect ratio follows the image automatically or can be fixed to square.
- **Auto-hiding overlay** — the overlay contains the media title, artist or source, media player tabs, and a button row. It fades out after a configurable duration and reappears on tap or media change.
- **Multi-player switching** — switch between multiple media players via pill tabs at the top of the card.
- **Configurable button row** — choose from built-in buttons (play/pause, previous, next, power, volume, shuffle, repeat) or add custom buttons with any icon, label, and tap action.
- **Visual editor** — fully configurable via the Lovelace GUI editor. No YAML required.
- **Native HA feel** — uses standard HA components (`ha-card`, `ha-switch`, `ha-icon-button`) and respects `card_mod`.

---

## Installation

### HACS (recommended)

1. Go to **HACS** in your Home Assistant.
2. Click the three-dot menu in the top right → **Custom repositories**.
3. Enter `https://github.com/YOUR_USERNAME/cover-media-card` and select category **Lovelace**, then click **Add**.
4. Find **Cover Media Card** in the list and click **Download**.
5. Hard refresh your browser (`Ctrl+Shift+R`).

### Manual

1. Download `cover-media-card.js` from the [latest release](../../releases/latest).
2. Copy it to `/config/www/cover-media-card.js`.
3. Go to **Settings → Dashboards → Resources** and add:
   ```
   /local/cover-media-card.js
   ```
4. Hard refresh your browser (`Ctrl+Shift+R`).

---

## Configuration

Add the card via the Lovelace UI editor, or configure it manually in YAML.

### Minimal

```yaml
type: custom:cover-media-card
players:
  - media_player.livingroom
```

### Full example

```yaml
type: custom:cover-media-card
players:
  - entity: media_player.livingroom
    name: Living room
  - entity: media_player.bedroom
    name: Bedroom
buttons:
  - play_pause
  - previous
  - next
  - power
  - volume_up
  - volume_down
  - shuffle
  - repeat
  - icon: mdi:information-outline
    label: More info
    tap_action:
      action: more-info
aspect_ratio: auto
auto_hide: true
show_duration: 10
show_on_change: true
volume_step: 2
```

### Options

| Option | Default | Description |
|---|---|---|
| `players` | required | List of `media_player` entities. Can be a string shorthand or an object with `entity` and optional `name`. |
| `buttons` | `[play_pause, power]` | Ordered list of buttons. Built-in buttons or custom button objects. |
| `aspect_ratio` | `auto` | `auto` follows the cover art dimensions (minimum square). `square` forces a square card. |
| `auto_hide` | `true` | Automatically hide the overlay after a timeout. |
| `show_duration` | `10` | Seconds before the overlay hides (only when `auto_hide` is `true`). |
| `show_on_change` | `true` | Show the overlay when the media changes. |
| `volume_step` | `2` | Volume percentage per step for `volume_up` / `volume_down` buttons. |

### Built-in buttons

`play_pause` `previous` `next` `power` `volume_up` `volume_down` `shuffle` `repeat`

### Custom buttons

```yaml
- icon: mdi:information-outline
  label: More info
  tap_action:
    action: more-info
```

Custom buttons support any [HA tap action](https://www.home-assistant.io/dashboards/actions/).

Use the optional `players` key to show a custom button only for specific players:

```yaml
- icon: mdi:information-outline
  label: More info
  players:
    - media_player.livingroom
  tap_action:
    action: more-info
```

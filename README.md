[![Made for Home Assistant](https://img.shields.io/badge/Made%20for-Home%20Assistant-blue?style=for-the-badge&logo=homeassistant)](https://www.home-assistant.io/)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)

# Cover Media Card

> [!NOTE]
> This card is vibe coded

A Home Assistant Lovelace card that turns your media players into a full-bleed cover art display. Controls stay out of the way until you need them.

![Cover Media Card](images/preview.png)

---

## Features

- **Cover art background** — artwork fills the entire card. Aspect ratio follows the image automatically, or lock it to square.
- **Auto-hiding overlay** — track title, artist, and controls fade out after a configurable timeout. Tap to show them, or they reappear automatically on track change.
- **Multi-player tabs** — configure multiple media players and switch between them with a tap.
- **Visual editor** — players, buttons, and overlay behavior are all configurable without YAML.

With YAML you can also configure:

- **Grouping** — join or unjoin Sonos (and compatible) players directly from the card.
- **Per-player buttons** — use a different button set for each player.
- **Conditional visibility** — show or hide any button or player tab based on entity state.

---

## Installation

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=klaptafel&repository=ha-cover-media-card&category=dashboard)

1. Go to **HACS** → three-dot menu → **Custom repositories**.
2. Enter `https://github.com/klaptafel/ha-cover-media-card`, category **Dashboard**, click **Add**.
3. Find **Cover Media Card** and click **Download**.

---

## Configuration

The visual editor covers the most common setup: adding players, selecting buttons, and adjusting overlay behavior. Advanced options — grouping, per-player buttons, and conditional visibility — require YAML.

### Minimal

```yaml
type: custom:cover-media-card
players:
  - media_player.living_room
```

### Options

| Option | Default | Description |
|---|---|---|
| `players` | required | One or more media players. |
| `buttons` | `[play_pause, power]` | Buttons to show, in order. |
| `aspect_ratio` | `auto` | `auto` follows cover art. `square` forces 1:1. |
| `auto_hide` | `true` | Auto-hide the overlay when media is playing. |
| `show_duration` | `10` | Seconds before the overlay hides. |
| `show_on_change` | `true` | Show the overlay when the track changes. |
| `volume_step` | `2` | Volume step in percent. |

### Built-in buttons

`play_pause` `previous` `next` `volume_up` `volume_down` `shuffle` `repeat` `power` `group`

The `group` button is hidden by default and auto-enabled when any player has `group_members` configured.

### Custom buttons

Add a button with any MDI icon and HA tap action:

```yaml
type: custom:cover-media-card
players:
  - media_player.living_room
buttons:
  - play_pause
  - power
  - icon: mdi:netflix
    label: Open Netflix
    tap_action:
      action: perform-action
      perform_action: media_player.select_source
      data:
        source: Netflix
      target:
        entity_id: media_player.living_room
```

Supports any [HA tap action](https://www.home-assistant.io/dashboards/actions/).

---

## Advanced

### Grouping

Add `group_members` to a player to enable the group button. Tapping it joins all listed players. The overlay shows feedback while the operation is in progress.

```yaml
type: custom:cover-media-card
players:
  - entity: media_player.living_room
    name: Living Room
    group_members:
      - media_player.kitchen
      - media_player.bedroom
  - entity: media_player.kitchen
    name: Kitchen
  - entity: media_player.bedroom
    name: Bedroom
```

### Per-player buttons

Override the button set for a specific player using `buttons` on a player entry:

```yaml
type: custom:cover-media-card
players:
  - entity: media_player.living_room
    name: Living Room
  - entity: media_player.tv
    name: TV
    buttons:
      - play_pause
      - power
```

### Visibility

Show or hide buttons or player tabs based on any entity state. Visibility accepts a list of conditions — all must be true.

**Show a player tab only when a switch is on:**

```yaml
type: custom:cover-media-card
players:
  - entity: media_player.living_room
    name: Living Room
  - entity: media_player.kitchen
    name: Kitchen
    visibility:
      - condition: state
        entity: switch.kitchen_active
        state: "on"
```

**Show a button only while media is playing or paused:**

```yaml
type: custom:cover-media-card
players:
  - media_player.living_room
buttons:
  - play_pause
  - icon: mdi:netflix
    label: Open Netflix
    visibility:
      - condition: state
        entity: media_player.living_room
        state:
          - playing
          - paused
    tap_action:
      action: perform-action
      perform_action: media_player.select_source
      data:
        source: Netflix
      target:
        entity_id: media_player.living_room
```

Available condition types:

| Condition | Key fields |
|---|---|
| `state` | `entity`, `state` or `state_not` (single value or list) |
| `numeric_state` | `entity`, `above`, `below`, optional `attribute` |
| `attribute` | `entity`, `attribute`, `value` |
| `and` | `conditions: [...]` — all must be true |
| `or` | `conditions: [...]` — at least one must be true |

Time-based conditions are not supported. Use a [template binary sensor](https://www.home-assistant.io/integrations/template/) to expose time-based logic as an entity state.

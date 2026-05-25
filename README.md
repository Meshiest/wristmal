# Wristmal

A Pebble watch app for managing your [MyAnimeList](https://myanimelist.net) watchlist from your wrist. Browse your currently-watching anime, increment episodes, update scores, and mark series as completed - all synced back to MAL in real time.

## Features

- **Browse your watchlist** - scrollable list showing anime titles, episode progress, and scores
- **Quick increment** - double-tap or long-press SELECT to bump the episode count
- **Edit scores** - rate anime 0-10 from the edit menu
- **Edit episodes** - manually set episode count with hold-to-repeat for fast adjustment
- **Mark completed** - automatically sets today as the finish date and updates status
- **Round display support** - works on both rectangular (Emery) and round (Gabbro) screens

## Target Platforms

| Platform | Display |
|----------|---------|
| Pebble Time 2 (Emery) | 200x228 rectangular |
| Pebble Round 2 (Gabbro) | 180x180 round |

## Setup

### Prerequisites

- Pebble SDK (v3)
- cloudpebble/Linux/WSL recommended on Windows
- A MyAnimeList account

### MyAnimeList API

1. Register an API client at [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig)
2. Note your **Client ID**
3. Build and install the app, then open its settings page on your phone to authenticate via OAuth2

### Build & Install

If you are not using cloudpebble, you will need to use the pebble dev tools:

```sh
pebble build
pebble install --phone <IP_ADDRESS>
```

## Usage

### List Screen

| Button | Action |
|--------|--------|
| UP / DOWN | Navigate the list |
| SELECT | Open edit menu |
| SELECT (double-tap) | Quick increment episode |
| SELECT (long-press) | Quick increment episode |

### Edit Menu

Three options from the selected anime:

- **Edit Score** - adjust rating (0-10)
- **Increment Episode** - bump to next episode
- **Edit Episodes** - set an exact episode count

### Number Editor

| Button | Action |
|--------|--------|
| UP / DOWN | Adjust value (hold for rapid change) |
| SELECT | Confirm |
| BACK | Cancel |

When an episode count reaches the series total, a confirmation screen asks whether to mark the anime as completed.

## Architecture

```
src/
  embeddedjs/          Watch-side app (Pebble Alloy / Moddable JS)
    main.js            Entry point, screen manager, state, message handler
    buttons.js         Button utility (double-tap, hold-repeat detection)
    list-screen.js     Anime list with status bar
    edit-menu.js       Three-option edit menu
    number-editor.js   Score/episode numeric editor
    confirm-screen.js  Completion confirmation dialog
  pkjs/
    index.js           Phone companion (PebbleKit JS, MAL API calls)
  c/
    mdbl.c             Moddable entry point stub
config/
  index.html           OAuth2 configuration page served on phone
```

The watch communicates with the phone via AppMessage key-value pairs. The phone companion handles all HTTP calls to the MAL API, token management, and refreshes.


# Jellyfin Smart Shuffle
![GitHub Release](https://img.shields.io/github/v/release/shalebridge/jellyfin-smart-shuffle)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/shalebridge/jellyfin-smart-shuffle/total?color=green)
![GitHub last commit](https://img.shields.io/github/last-commit/shalebridge/jellyfin-smart-shuffle/main?logo=semantic-release&logoColor=orange&label=Last%20Updated&color=AA5CC3&cacheSeconds=3600)
![Static Badge](https://img.shields.io/badge/Jellyfin%20Version-10.10%2C%2010.11-AA5CC3?logo=jellyfin&logoColor=00A4DC)


Smart Shuffle is a Jellyfin plugin that adds persistent, weighted shuffle playback for TV series, seasons, playlists, and collections.

Unlike traditional shuffle playback, Smart Shuffle remembers previously played items and avoids immediate repeats until the entire queue has been exhausted.

---

# Features

* Persistent per-user shuffle database.
* Weighted randomization favoring less-played and least-recently-played episodes.
* Playback using Jellyfin's native playback system:
	* Web UI integration with a native Smart Shuffle button.
	* Playback queue integration for seamless episode transitions
* Works with:
  * Series
  * Seasons
  * Playlists
  * Collections
* Each queue tracks:
  * Played items
  * Remaining items
  * Queue order
  * Playback history
* Metadata tags can be used to exclude certain files from queue inclusion (specials, clip shows, etc).
* Queue inspection and reset.
* Automatic queue refill after all items are played.

---

# Requirements

* Jellyfin 10.11.x
* [File Transformation plugin](https://github.com/IAmParadox27/jellyfin-plugin-file-transformation). Smart Shuffle depends on this for Web UI injection.

---

# Installation

## Plugin Repository

Add the Smart Shuffle plugin repository URL to Jellyfin:

```text
https://raw.githubusercontent.com/shalebridge/jellyfin-smart-shuffle/refs/heads/main/manifest.json
```

Then install:

```text
Dashboard -> Plugins -> Catalog -> Smart Shuffle
```

Restart the server to load the plugin. You may need to refresh the web page client to see changes using <b>CTRL+F5</b> or by restarting the client.

---

# Usage

Navigate to a:
* TV series
* Season
* Playlist
* Collection

A new button should appear to the right of the other buttons:

```text
Smart Shuffle
```

Selecting it will:

1. Build a weighted shuffle queue
2. Favor less-played and least-recently-played content
3. Avoid immediate repeats.
4. Queue all remaining unplayed items.
5. Automatically refill once exhausted.

Playback uses Jellyfin's native playback queue system.

---

# Configuration Page

The plugin configuration page includes:

* Current queue summary:
  * Number of active queues
  * Number of tracked items 
  * Overall Play counts
  * Overall remaining count
  * Last updated date
  * Queue reset controls
* List of excluded media tagged with `SmartShuffleExclude`.
* General information.
* Diagnostics

This allows administrators to inspect and clear shuffle state.

---

# Client Compatibility

Because this plugin relies on injecting JavaScript and CSS into the web interface, it works best on clients that use the web wrapper.

* :white_check_mark: - Tested functional.
* :warning: - Untested, should be functional.
* :x: - Not supported.

| Client Platform | Status | Notes |
| :--- | :---: | :--- |
| **Browsers** (Firefox, Chrome etc.) | :white_check_mark: | Direct JS injection |
| **Jellyfin Media Player/Desktop** (Windows/MacOS) | :white_check_mark:| Uses Jellyfin web |
| **iOS App** | :white_check_mark: | Uses a web wrapper |
| **LG TV** | :white_check_mark: | Uses a web wrapper |
| **Android App** | :warning: | Uses a web wrapper |
| **Android TV / Fire TV** | :x: | **Not supported.** Uses a native Java/Kotlin UI. |
| **Roku** | :x: | **Not supported.** Uses a native UI. |
| **Swiftfin** (iOS/tvOS) | :x: | **Not supported.** Uses a native Swift UI. |
| **Kodi** (via Jellyfin Addon) | :x: | **Not supported.** Uses Kodi's native skinning engine. |

---

# Database

Smart Shuffle stores persistent queue state in SQLite. Tracked information includes:

* User and Item IDs
* Scope
* Queue position
* Played status
* Playback timestamps

---

# Development

## Build Config Typescript Page

```bash
Web/npm run build
```

## Build Plugin

```bash
dotnet build -c Release
```

## Release Output

```text
bin/Release/net9.0/
```

---

# Thanks
Portions of this code were based on or inspired by the following Jellyfin plugins:
* [Intro Skipper](https://github.com/intro-skipper/intro-skipper)
* [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)
* [MediaBar Enhanced](https://github.com/DI0IK/jellyfin-plugin-media-bar-enhanced/tree/main)

# Contributing

Please feel free to contribute by reporting bugs, feature requests, or creating pull requests.

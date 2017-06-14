# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.3.1](https://github.com/Skellington-Closet/skellington/compare/v1.3.0...v1.3.1)

### Fixed

- Calls `controller.startTicking()` if `startRtm` is false. This fixes and issue where conversations would not work for Slack Apps. See #54 for more details.

## [1.3.0](https://github.com/Skellington-Closet/skellington/compare/v1.2.0...v1.3.0)

### Added

- Adds `startRtm` option for Slack apps. If `startRtm` is strictly false Skellington will not initiate an RTM connection when adding a new bot.
Setting `startRtm` to false also means that the `botConnected` lifecycle method will never be called.

## [1.2.0](https://github.com/Skellington-Closet/skellington/compare/v1.1.2...v1.2.0)

### Changed

- Bumps Botkit dep to `0.5.4`. Also adds [Greenkeeper](https://greenkeeper.io/) to keep deps up to date.


## [1.1.2](https://github.com/Skellington-Closet/skellington/compare/v1.1.1...v1.1.2)

### Changed

- Fixes typo for default Botkit configs. Skellington should now correctly disable Botkit studio stats collection by default.
Skellington always supported passing in the `stats_optout` option throught the `botkit` config key, this only affected default behavior.


## [1.1.1](https://github.com/Skellington-Closet/skellington/compare/v1.1.0...v1.1.1)

### Changed

- Skellington will no longer attempt to reconnect on the `rtm_close` event and will instead defer to Botkit's reconnection strategy.
This fixes a bug where Skellington can reconnect twice causing multiple responses. See issue #44 for more details.

## [1.1.0](https://github.com/Skellington-Closet/skellington/compare/v1.0.0...v1.1.0)

### Added

- New `logger` option.

### Changed

- Default Botkit logger now uses [Skellington Logger](https://github.com/Skellington-Closet/skellington-logger)
- Skellington uses its own logger instead of piggy-backing on Botkit's logger.


## [1.0.0](https://github.com/Skellington-Closet/skellington/compare/v0.2.0...v1.0.0)

### Added

- Beautiful new logo from [@jasonrhodes](https://github.com/jasonrhodes)!
- Debug mode for logging all messages to `controller.hears` calls. Adds a `skellington` key to the message object.
- Skellington instance returned from exported function. There's not much here until you turn on debug mode.

### Changed

- Support for Slack apps! (So much work for one line in the change log.)
- Adds `botConnected` callback triggered on successful connection to the Slack RTM API.
- Botkit.slackbot configs are now in the `botkit` config stanza. This will future-proof the config options and prevent collisions.
- Botkit dependency is now `^` matched to help bug fixes and new features propagate quicker.

## [0.2.0](https://github.com/Skellington-Closet/skellington/compare/v0.1.1...v0.2.0)

### Changed

- Bumped Botkit version to 0.4.0.
- Non-Skellington configs passed directly to Botkit.slackbot config (switching from inclusion list to an exclusion list for config).

### Removed

- Support for the undocumented feature of auto-detecting Slack API token from environment variables.

## [0.1.1](https://github.com/Skellington-Closet/skellington/compare/2b513a732fbb3d9c3bc4bb583e34fc4dfe9e7dd4...v0.1.1)

### Changed

- Bumped Botkit version to 0.2.2.

## 0.1.0

### Added

- Every initial feature! Single-team Slack bot with plugin architecture. 

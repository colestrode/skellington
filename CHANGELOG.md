# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).


## 1.0.0

### Added

- Beautiful new logo from [@jasonrhodes](https://github.com/jasonrhodes)!

### Changed

- Support for Slack apps! (So much work for one line in the change log.)
- Adds `botConnected` callback triggered on successful connection to the Slack RTM API.
- Botkit.slackbot configs are now in the `botkit` config stanza. This will future-proof the config options and prevent collisions.

## 0.2.0

### Changed

- Bumped Botkit version to 0.4.0.
- Non-Skellington configs passed directly to Botkit.slackbot config (switching from inclusion list to an exclusion list for config).

### Removed

- Support for the undocumented feature of auto-detecting Slack API token from environment variables.

## 0.1.1

### Changed

- Bumped Botkit version to 0.2.2.

## 0.1.0

### Added

- Every initial feature! Single-team Slack bot with plugin architecture. 

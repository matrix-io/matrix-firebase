# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
### Removed
- Stopped setOnline / setOffline from changing user record
### Added 
- allowTracking, denyTracking, refs.userMeta

## [1.0.27]
### Changed
- device.setOnline / setOffline also changes users>deviceId>online
- app.watchStatus don't cb if status doesn't exist
- app.getStatus do cb if status does't exist
- update search to filter results for match

## [1.0.24]
### Added
- History File

### Changed
- app.getStatus changed from on to to once

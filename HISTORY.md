# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).
## [1.2.2]
### Removed 
- Version check on load

## [1.2.1]
- Switch search to lookup on shortname

## [1.2.0]
### Added
- Retry in case of firebase fail
## [1.1.1]
- Include goCompleted for setting up status update, and setting disconnect event.
- Remove ping function
- Setup device status to use workers

## [1.1.2]
### Changed
- Modified search to return only visible items

## [1.1.0]
### Removed
- Stopped setOnline / setOffline from changing user record
### Added 
- allowTracking, denyTracking, refs.userMeta
- user.get and user.update - worker

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

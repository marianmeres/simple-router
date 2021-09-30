# Changelog

## [Unreleased]
	- optional path segments

## [1.8.0] - 2021-09-30
### Added
	- "rest segments" support

## [1.7.1] - 2021-07-09
### Added
	- deps update

## [1.7.0] - 2021-04-22
### Added
	- route (optional) label support added

## [1.6.0] - 2021-04-07
### Added
	- router's current contains both route and params { route: string; params: any }

## [1.5.0] - 2021-03-31
### Added
	- added support for optional segments marked as `foo?` or if named as `[foo]?`

## [1.4.0] - 2021-02-22
### Added
	- router's current route as observable (via .subscribe)

## [1.3.0] - 2021-02-22
### Added
	- `router.current` -> most recently matched route via `router.exec()`

## [1.2.0] - 2021-02-07
### Added
	- url decode by default on segments as well (not just on query vars)

## [1.1.0] - 2021-01-29
### Added
	- query vars parsing support
	- changelog

## [1.0.0] - 2020-11-??
### Added
	- basic path matching

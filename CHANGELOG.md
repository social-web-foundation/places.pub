# Changelog

<!-- markdownlint-configure-file { "MD024": { "siblings_only": true } } -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Modern builder for project.toml

## [2.1.1] - 2026-10-25

### Changed

- engines.node to 24 for Google Cloud

## [2.1.0] - 2026-10-25

### Added

- Added a CHANGELOG.md

### Security

- Update dependencies with npm audit fix.

### Changed

- Switch Overpass requests to Overpass.ch, using the OVERPASS_API_KEY environment variable.
- Convert the function to ECMAScript modules.
- Target Node.js 24 and add an .nvmrc for local development.

## [2.0.7] - 2026-10-23

### Changed

- Target Node.js 22.
- Update direct and transitive dependencies.

### Fixed

- Improve the home page layout on mobile devices.

## [2.0.6] - 2025-07-18

### Fixed

- Await asynchronous route handlers so request errors reach the error handler.

## [2.0.5] - 2025-07-18

### Fixed

- Correct the response header method used by the error handler.

## [2.0.4] - 2025-07-18

### Fixed

- Correctly recognize ProblemDocument errors.

## [2.0.3] - 2025-07-18

### Fixed

- Handle OpenStreetMap elements without tags.

## [2.0.2] - 2025-07-18

### Fixed

- Apply name and bounding-box filters to enclosing relations in search results.

## [2.0.1] - 2025-07-18

### Fixed

- Correct interpolation in Overpass queries.

## [2.0.0] - 2025-07-18

### Changed

- Use Overpass API for place lookups and search instead of BigQuery.

### Added

- Return problem documents for HTTP errors.

[Unreleased]: https://github.com/social-web-foundation/places.pub/compare/v2.1.1...HEAD
[2.1.1]: https://github.com/social-web-foundation/places.pub/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/social-web-foundation/places.pub/compare/v2.0.7...v2.1.0
[2.0.7]: https://github.com/social-web-foundation/places.pub/compare/v2.0.6...v2.0.7
[2.0.6]: https://github.com/social-web-foundation/places.pub/compare/v2.0.5...v2.0.6
[2.0.5]: https://github.com/social-web-foundation/places.pub/compare/v2.0.4...v2.0.5
[2.0.4]: https://github.com/social-web-foundation/places.pub/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/social-web-foundation/places.pub/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/social-web-foundation/places.pub/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/social-web-foundation/places.pub/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/social-web-foundation/places.pub/releases/tag/v2.0.0

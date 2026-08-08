# Changelog

All notable changes to this repository are documented here.

## 2.0.0 — 2026-08-07

### Added

- `--fail-on-change` scheduler semantics (exit `2` after emitting qualifying evidence);
- bounded direct Suwappu REST deadlines;
- compiled CLI, dependency-audit, non-root container, and CodeQL release gates;
- operations and contributor runbooks.

### Changed

- direct lending-detail failures expose status only instead of raw upstream bodies;
- CI installs from the lockfile and verifies the distributable/container;
- production operation is explicitly one-shot/scheduler-owned rather than an implicit polling daemon.

## 1.1.0

- versioned TypeScript/Python snapshots and deterministic APY/utilization change detection;
- chain-scoped detail reads and explicit metric-unit handling.

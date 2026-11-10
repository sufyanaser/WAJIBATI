# Changelog

## [1.2.0] - 2026-11-10

### Added
- Unified mobile admin shell with bottom navigation and section routing.
- Admin density stylesheet (`src/admin-density.css`) for responsive data
  density across phone and desktop widths.
- Timetable autosave with conflict protection and regression tests.
- Android hardware back navigation inside admin sections
  (`useAndroidBackNavigation`).
- Auth error classification (`classifyAuthError` / `authErrorMessage`):
  network, rate-limit, server, and invalid-credentials each get their own
  Arabic message.
- Arabic-Indic and Persian digit support for phone and PIN input
  (`toWesternDigits`), preserving leading PIN zeros.
- macOS/Linux desktop builds: cross-platform secure-store fallback with
  user-only file permissions; bundle targets extended to app/dmg.

### Changed
- Unified version to 1.2.0 (build 10) across Android, iOS, desktop, and web.
- Android toolchain: compileSdk/targetSdk 35, AGP 8.7.2, Gradle 8.11.1,
  minSdk 23 (required by Capacitor 7 libraries).
- Vitest no longer depends on a developer `.env`; Supabase env is stubbed
  in test config.

### Fixed
- Login no longer shows "wrong credentials" on network failures.
- macOS desktop build no longer fails linking Windows-only libraries
  (DPAPI FFI gated behind `cfg(windows)`).

## [1.0.1] - earlier
- Prior Android baseline (versionCode 2).

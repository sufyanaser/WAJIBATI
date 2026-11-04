# Admin portal audit

Method: every `/admin/*` route rendered in Chromium with a fake owner session and empty data, at 1280 and 390 px. Screenshots are kept outside the repo (`/tmp/audit/admin-before`, `/tmp/audit/admin-after2`). Measured: horizontal overflow and inline-style count per route.

## Findings and status

| Area | Finding | Status |
|---|---|---|
| Timetable (admin) | `.tt-grid` rounded placeholders. Caused by the guardian timetable's `.tt-empty` class sharing a name with the admin's. | **Fixed.** Guardian classes renamed to `gtt-*`. |
| Timetable (admin) | Day column dark grey fill (`rgba(15,30,51,.5)`). | **Fixed.** Uses `--surface2`. |
| Table headers (`.dash-table`, `.tt-grid`) | Dark navy fill with accent-blue text on every admin table. | **Fixed.** `--surface2` and `--fg-secondary`. |
| Homework (daily) | Dark navy action bar. | **Fixed.** `--card` with `--border`. |
| Page header (`.admin-page-header`) | Gradient background. | **Fixed.** Solid `--card`. |
| Role badge (sidebar, top bar, more sheet) | Inline amber/blue/grey colours, not from tokens. | **Fixed.** `.role-pill--owner/editor/viewer` tokens. |
| Subnav pills (master data) | Tabs cut off at 1280 px. | **Fixed.** Wraps at ≥1024 px. |
| Dashboard | KPI tiles: the featured tile uses a blue number; the rest are navy. | Deferred. Pick one number colour. |
| Students, Guardians, Teachers, Subjects, Sections | Each page has its own hero card (left accent stripe on Students and Settings). Tables squeezed at 390 px (six columns). | Deferred. Needs one page-header pattern and stacked rows below 768 px. |
| Settings | 63 inline styles; hero card with a large empty area; mixed label styles. | Deferred. Largest single item. |
| Master data | Hero card per tab, toolbar buttons mixing `btn-primary` and `btn-publish-all`. | Deferred. |
| Homework (daily) | Class selector without a label; publish button still uses `btn-publish`. | Deferred. |
| Import, Notices | Own form styles (`import-*`, `notice-*`) not using the shared field classes. | Deferred. |

## Not verified
- Admin pages with real data (the harness returns empty lists).
- Desktop drawers, confirm dialogs and the record drawer.

## Proposed next PR
1. One `adm-page-head` pattern (title, subtitle, actions) on every admin page.
2. One field pattern (`adm-field`, `adm-label`, 44 px inputs) and remove the page-specific form classes.
3. Tables under 768 px: stacked rows (label/value), no horizontal scroll.
4. Settings: move the 63 inline styles to classes.

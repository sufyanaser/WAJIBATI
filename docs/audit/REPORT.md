# Visual audit report

Viewports: 320, 360, 390, 768, 1280. Screenshots: `/tmp/audit/before/` and `/tmp/audit/after/` (not committed). Axe-core 4.10.2, run from the local copy, not added to `package.json`.

## Route results

| Route | Lands on (no session) | Viewports | Overflow before | Overflow after | Axe before (390/1280) | Axe after |
|---|---|---|---|---|---|---|
| /login | /login | 320/360/390/768/1280 | none | none | — | — |
| / | /login | 320/360/390/768/1280 | none | none | — | — |
| /archive | /archive | 320/360/390/768/1280 | none | none | aria-prohibited-attr | — |
| /inquiries | /login | 320/360/390/768/1280 | none | none | — | — |
| /timetable | /login | 320/360/390/768/1280 | none | none | — | — |
| /admin/login | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/dashboard | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/homework | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/notices | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/import | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/master-data | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/students | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/guardians | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/teachers | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/subjects | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/sections | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/timetable | /admin/login | 320/360/390/768/1280 | none | none | — | — |
| /admin/settings | /admin/login | 320/360/390/768/1280 | none | none | — | — |

Only `/login`, `/`, `/archive`, `/admin/login` were reachable without a backend. Admin routes and data views (Today content, HomeworkCard, Archive with data, admin tables) were not rendered with data.

## Issues

| Issue | Evidence | Status |
|---|---|---|
| Contrast: white text on primary CTA | white on `#007BFE` 3.99, `#00B4D8` 2.46, `#00C29F` 2.28 (fails AA) | Fixed: `--cta-gradient` with all stops ≥4.5:1 (5.8 to 6.0) |
| Contrast: admin login gradient | white 2.04–4.47 and muted `#e0f7ff` on the light blue-teal gradient (fails) | Fixed: gradient darkened; `#e0f7ff` on the new stops is 5.96–6.06 |
| Contrast: toast status text | success `#05D380` and warn `#F59E0B` text on white (fails) | Fixed: text uses `--fg`; the status colour stays on the border |
| ARIA: aria-prohibited-attr on archive loading div | axe serious (1 node) | Fixed: role="status" added |
| z-index scale inconsistent | toast 9999 inline, drawers 80–95, modals 1000–9999 | Fixed: token scale; toast 1100, modal 1200 |
| Duplicate colour aliases | --fg-muted, --danger, --warning each had their own hex | Fixed: aliases point at one source value |
| Disabled buttons opacity 0.45 | below spec 0.5 | Fixed: 0.5 |
| Archive header overflow at 360px | header 376px on dev before PR #64 | Already fixed in PR #64 (2b2914c); not reproduced on the current dev baseline |

## Remaining (found, not fixed in this pass)

Measured by static scan of `src/styles.css` on this branch:
- Spacing px values: 619 declarations, 262 off the 4/8/12/16/20/24/32/40/48/64 scale.
- Border radius: 201 declarations, 87 hard-coded (not `var(--radius-*)`).
- Colour literals: 199 hex and 222 rgba/rgb values outside `:root`.
- Not audited: font-size and weight count per screen, tap-target sizes on every control, icon sizes across `Icons.tsx`, body line length.
- Not verified: loading, empty, error and success states on data views (need backend); admin table stacking below 768px; drawer focus trap, Escape and scroll lock.
- Dead CSS: none removed. Removal needs a grep proof per selector and was not done.
- Duplicate overrides such as `.student-bar` `!important` were not consolidated.

## Keyboard (Tab order, visible focus)
- `/login`: phone → password → `دخول الإدارة` link. Focus ring visible (solid, 3px). Submit button is disabled while the form is empty, so it is skipped.
- `/admin/login`: username → password → show-password → submit → parent-portal link. Focus ring visible (solid, 3px).

## Decisions needed
- The CTA gradient is darker than before. That is the trade-off for white-text contrast. The alternative is dark text on the brighter gradient, which only passes on the teal end.
- The admin login page is darker. Confirm this matches the admin brand.

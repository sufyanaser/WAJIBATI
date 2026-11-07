# Visual audit inventory

Source: routes from `src/App.tsx`, components from `src/components`, admin children from `src/pages/admin`.
States are recorded as **reachable without backend** (R) or **needs data** (D). Screenshots: `/tmp/audit/before` and `/tmp/audit/after` (not committed).

## Guardian portal
| Route | Page | States reachable without backend | Notes |
|---|---|---|---|
| `/login` | Login | default, focus, disabled submit (R); error (R via bad PIN, not run) | Submit is disabled until phone is filled, so it is skipped by Tab. |
| `/` | Today | empty/no-children (D) | Redirects to `/login` without a session. |
| `/archive` | Archive | loading (R) | Data view. Loading container fixed. |
| `/inquiries` | Inquiries | redirects to `/login` (D) | |
| `/timetable` | Timetable | redirects to `/login` (D) | |

## Admin portal
| Route | Page | States reachable without backend |
|---|---|---|
| `/admin/login` | AdminLogin | default, focus (R) |
| `/admin/dashboard` | DashboardHome | all states need a session (D) |
| `/admin/homework` | HomeworkEntry | D |
| `/admin/notices` | NoticesPage | D |
| `/admin/import` | ImportPage | D |
| `/admin/master-data` | MasterDataPage | D |
| `/admin/students` | StudentsPage | D |
| `/admin/guardians` | GuardiansPage | D |
| `/admin/teachers` | TeachersPage | D |
| `/admin/subjects` | SubjectsPage | D |
| `/admin/sections` | SectionsPage | D |
| `/admin/timetable` | TimetablePage | D |
| `/admin/settings` | SettingsPage | D |

All `/admin/*` routes redirect to `/admin/login` without a session, so only the login page could be rendered in this pass.

## Shared components (`src/components`)
BottomNavBar, PageHeader, AuthScenery, Toast, EmptyState, Spinner, Icons, ExportModal, ExportButton, DateNavigator, HomeworkCard, HomeworkSearch, PushOptIn, IosUpdateGate, NativeLinkBridge, `guardian/*`, `admin/*` (RecordDrawer, ConfirmDialog, PageHeader, PeriodRow, AdminDataTable, StatusBadge).

Rendered here: Toast (via code only, no trigger), BottomNavBar and PageHeader (on Archive), AuthScenery (login). Not rendered: everything that needs data.

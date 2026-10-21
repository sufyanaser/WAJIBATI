# ARCHITECTURE AUDIT — Wajibati (واجبات الرميلة)
**Date:** 2026-10-21  
**Auditor:** Agent 01 — Repository & Architecture Auditor  
**Scope:** Read-only; no production files modified.

---

## A. صفحات التطبيق / Pages Inventory

| File | Route | Status |
|------|-------|--------|
| `src/pages/Login.tsx` | `/login` | **Complete** — phone + PIN form, error handling, Spinner |
| `src/pages/Today.tsx` | `/*` (default) | **Complete** — auth, children bootstrap, date nav, calendar popup, search, homework list, push opt-in, ExportButton |
| `src/pages/Archive.tsx` | `/archive` | **Partial** — paginated list with skeleton loader, HomeworkSearch component; missing mark_read call |
| `src/pages/AdminLogin.tsx` | `/admin/login` | Not audited (not in task scope) |
| `src/pages/admin/AdminShell.tsx` | `/admin` (layout) | Not audited |
| `src/pages/admin/HomeworkEntry.tsx` | `/admin/homework` | Not audited |
| `src/pages/admin/NoticesPage.tsx` | `/admin/notices` | Not audited |
| `src/pages/admin/ImportPage.tsx` | `/admin/import` | Not audited |
| **`src/pages/Admin.tsx`** | **ORPHANED** | **Dead file** — not imported by `src/App.tsx`; the admin routes were refactored into `src/pages/admin/*` sub-pages. This ~600-line file is unreachable. |

**Note:** `src/App.tsx` routes are: `/login`, `/archive`, `/admin/login`, `/admin` (with nested `homework`, `notices`, `import`), and `/*` → Today.

---

## B. نظام التنسيق / Styling System

**Method:** CSS custom properties (`var(--name)`) defined on `:root` in `src/styles.css`. No Tailwind. No CSS-in-JS library.

**Inline usage:** `src/pages/Login.tsx` uses `style={{ background: 'var(--bg)' }}` — inline props reference the same CSS variables, so the system is consistent.

**Main color tokens (src/styles.css lines 1–23):**

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#08152A` | Page background (also index.html theme-color) |
| `--card` | `#0F1E33` | Card/panel background |
| `--card2` | `#172842` | Secondary card |
| `--surface3` | `#1A2E4A` | Tertiary surface / skeleton |
| `--fg` | `#DCE8F4` | Primary foreground text |
| `--muted` | `#6A8BAC` | Secondary text |
| `--faint` | `#374F69` | Disabled / very muted |
| `--accent` | `#E8B04A` | Gold accent (titles, CTA) |
| `--accent-dim` | `#9B6E1E` | Dimmed accent |
| `--err` | `#E5534B` | Error red |
| `--border` | `#1E3352` | Border / divider |
| `--success` | `#1DB87E` | Success green |
| `--warn` | `#F27038` | Warning orange |
| `--role-admin` | `#3D84C8` | Admin badge |
| `--role-guardian` | `#8B5CF6` | Guardian badge |
| `--role-system` | `#14B8A6` | System badge |

**Hard-coded hex overrides:** `vite.config.ts` PWA manifest uses `#0F1E33` (background_color) and `#1F3A5F` (theme_color) directly. `index.html` has `theme-color: #08152A`. These are not token references.

---

## C. مكتبات PDF والتصدير / PDF & Export Libraries

From `package.json`:

| Library | Version | Purpose |
|---------|---------|---------|
| `html-to-image` | `^1.11.11` | DOM-to-image capture used in `ExportButton` (`src/utils/exportHomework.ts`) |

**Not present:** jsPDF, pdfmake, puppeteer, playwright, html2canvas, canvas, sharp, wkhtmltopdf.

**Risk note:** `html-to-image` works by cloning the DOM and rendering to a canvas. Google Fonts (Tajawal) loaded via `<link>` are cross-origin and may not be embedded in the captured image unless explicitly inlined. Arabic RTL text rendering has known issues in some canvas implementations.

---

## D. Publisher Attribution Analysis

### homework table fields (migration line 97–110)
- `created_by uuid references auth.users(id)` — set at INSERT; **not updated** when status changes from draft → published.
- **No `published_by` field.** No `publisher_id` field.
- **No `updated_by` or `last_modified_by` field.**
- `updated_at` is touched by trigger on any UPDATE, but records no actor.

### admins table fields (migration line 90–94)
- `user_id uuid` (PK, references auth.users)
- `full_name text NOT NULL` — **YES, full_name exists.**
- `role text` (owner|editor|viewer)

### Join path to publisher display name
```
homework.created_by → auth.users.id → admins.user_id → admins.full_name
```
This requires crossing the `auth.users` table, which is **not accessible via the anon key** or through standard Supabase RLS policies from the client. To surface the publisher's name, one of the following is required:

1. A migration adding `published_by uuid references admins(user_id)` populated via a trigger or application logic on `status = 'published'`.
2. A Postgres view joining homework to admins via auth.uid() comparison (admin-only, not guardian-facing).
3. A denormalized `published_by_name text` column populated at publish time (simplest client-side approach).

### Draft-to-published transition
In `src/pages/Admin.tsx` (orphaned) and presumably in `src/pages/admin/HomeworkEntry.tsx`, the publish call is:
```ts
supabase.from('homework').update({ status: 'published', ... }).eq('id', newId)
```
Only `updated_at` (via trigger) records this event. `created_by` is set only at INSERT and is never updated. If an editor other than the original creator publishes a draft, `created_by` reflects the creator, not the publisher — these are different people.

### Conclusion
**Cannot reliably show publisher name without a migration.** The data model tracks who created a homework row but not who published it. A migration adding `published_by uuid references admins(user_id)` (nullable, set on publish) is needed before publisher attribution is implementable.

---

## E. Brand Strings — Non-Migration Source Files

All occurrences of "واجبات الرميلة", "Rumaila", or "rumaila":

| File | Line | String |
|------|------|--------|
| `index.html` | 7 | `<title>واجبات الرميلة</title>` |
| `vite.config.ts` | 19 | `name: 'واجبات الرميلة'` (PWA manifest) |
| `src/pages/Today.tsx` | 239 | `<h1>واجبات الرميلة</h1>` (no-children state) |
| `src/pages/Today.tsx` | 258 | `<h1>واجبات الرميلة</h1>` (main render) |
| `src/pages/Login.tsx` | 55 | `alt="واجبات الرميلة"` (img alt) |
| `src/pages/Login.tsx` | 62 | `واجبات الرميلة` (h1 text) |
| `src/utils/exportHomework.ts` | 167 | `` `واجبات الرميلة · ${data.schoolName}` `` |
| `src/sw.ts` | 23 | `'واجبات الرميلة'` (notification title fallback) |
| `src/lib/supabase.ts` | 10 | `@guardian.rumaila.local` (email domain) |
| `src/hooks/useAdminSection.ts` | 204 | `'واجبات الرميلة'` (push notification title) |
| `src/hooks/__tests__/useAdminSection.test.ts` | 243 | `'واجبات الرميلة'` (test assertion) |

**Total: 11 occurrences across 8 files.**

The school name is hardcoded in most places. `Today.tsx` does fetch `settings.school.name` dynamically (line 88–93) and overrides `schoolName` state, but the `<h1>` still reads the hardcoded literal. The `src/sw.ts` fallback and `useAdminSection.ts` push title cannot be made dynamic without a service worker message bus or a migration-stored setting.

---

## F. Top 5 Technical Risks

### Risk 1 — Publisher Attribution Requires a Migration (HIGH)
The `homework` table has `created_by` but no `published_by`. Any UI feature showing "published by [name]" is blocked until a migration adds `published_by uuid references admins(user_id)` (nullable) and application logic fills it on publish. The join to `auth.users` from the client is not possible via the anon key.

### Risk 2 — html-to-image Arabic Font Rendering (MEDIUM)
`html-to-image` clones the DOM to a canvas. The Tajawal font is loaded from Google Fonts via a `<link>` tag in `index.html` — cross-origin requests from inside a cloned document/canvas context may fail silently, causing the export image to fall back to system fonts. Arabic RTL diacritics and ligatures may also render incorrectly. The export should be tested with actual school content before release; font inlining (base64 embedding) may be required.

### Risk 3 — src/pages/Admin.tsx is a Dead/Orphaned File (MEDIUM)
`src/pages/Admin.tsx` (~600+ lines) is not imported by `src/App.tsx`. The admin section was refactored into `src/pages/admin/*`. This dead file defines types (`PSlot`, `HwRow`, etc.) and business logic that may diverge from the live admin pages. Future developers may edit the wrong file. It should be deleted.

### Risk 4 — School Name Hardcoded in Service Worker (LOW-MEDIUM)
`src/sw.ts` line 23 uses `'واجبات الرميلة'` as a push notification title fallback. Service workers cannot read from Supabase `settings` at runtime. If the school name ever changes (e.g. for a multi-school deployment), the SW title cannot be updated without a code change and redeployment. The `settings.school.name` dynamic fetch in `Today.tsx` is not propagated to the SW.

### Risk 5 — No Archive Route Guard (LOW)
`src/pages/Archive.tsx` is a full page on route `/archive` but there is no auth check shown in the first 80 lines read. If the component does not redirect unauthenticated users to `/login`, the route is accessible without login (though Supabase RLS would return empty data). This is a UX gap but could leak the page shell.

---

## Summary

- **Pages:** 4 guardian pages (Login, Today, Archive, orphaned Admin.tsx), 4 admin sub-pages under `/admin/*`. `Admin.tsx` is a dead file.
- **Styling:** Pure CSS custom-property system, dark navy palette, no Tailwind.
- **Export:** `html-to-image` only; no PDF library.
- **Publisher attribution:** Blocked without migration — no `published_by` column exists.
- **Brand strings:** 11 occurrences in 8 source files; school name is mostly hardcoded.
- **Top risk:** Publisher attribution and html-to-image Arabic font embedding.

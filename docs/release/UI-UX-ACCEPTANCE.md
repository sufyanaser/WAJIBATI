Now I have enough data for the full audit. Let me compile the findings.

---

# UI/UX Acceptance Audit — واجباتي (WAJIBATI PWA)

**Auditor:** Agent 06 — UI/UX & Accessibility
**Date:** 2026-10-21
**Scope:** Code-level analysis of styles.css, index.html, components, pages

---

## A — Design Tokens

**PARTIAL**

A full `--color-*` token system is defined on `:root` (lines 2–70 of styles.css). However a second `:root` block immediately follows (lines 87–110) with shorthand aliases (`--bg`, `--card`, `--fg`, `--muted`, `--accent`, `--err`, etc.). Almost every component uses the shorthand aliases, not `--color-*`. The two sets co-exist but are not linked: changing `--color-bg-primary` has no effect unless components reference it, which they mostly do not.

**Fix needed:** Either delete the `--color-*` block and keep shorthands as the sole token system, or map the shorthands to reference `--color-*` (e.g. `--bg: var(--color-bg-primary)`). Current duplication is a maintenance hazard.

---

## B — Dark/Light Mode

**PARTIAL**

`[data-theme="light"]` is defined and overrides the `--color-*` tokens. However:
- `prefers-color-scheme: light` media query is absent — light mode requires a manual `data-theme` attribute, not automatic OS preference.
- The `[data-theme="light"]` block does NOT override the shorthand tokens (`--bg`, `--card`, `--fg`, etc.) that components actually read, so toggling the data-theme attribute has no visual effect.

**Fix needed:** Add `@media (prefers-color-scheme: light) { :root { --bg: ... } }` overriding the shorthand tokens, or map shorthands through `--color-*` as noted in (A).

---

## C — Color Palette

**PASS**

Accent `#E8B04A` matches spec. `--card: #0F1E33` matches spec's primary navy. `--bg: #08152A` is slightly darker than spec's `#0F1E33` (deeper background behind cards, intentional). PWA manifest `background_color: '#0F1E33'`, `theme_color: '#1F3A5F'` match AGENTS.md spec. Status colors (success green, error red, warning orange) are consistent.

---

## D — Arabic RTL

**PASS**

`<html lang="ar" dir="rtl">` is set in index.html. Components add `dir="rtl"` redundantly where needed (HomeworkEntry, HomeworkCard, DateNavigator, PeriodRow textarea). Phone/PIN inputs intentionally use `dir="ltr"` for numeric entry — correct. `border-right` is used for RTL-side decorations (notices, period-card published state) — correct for RTL. `margin-right: auto` is used for push-to-far-end in RTL flex rows — correct.

Minor: `.select` utility class sets `background-position: left .75rem center` for the dropdown arrow. In RTL layouts this should be `right .75rem center` (logical property: `inline-end`). Low visual impact.

---

## E — Font Stack

**PARTIAL**

`Tajawal` is loaded from Google Fonts in index.html (weights 400, 500, 700, 900). Body font declaration is `'Tajawal', 'IBM Plex Sans Arabic', system-ui, sans-serif` — excellent Arabic fallback chain. However, `--font-family-arabic` token includes `'Cairo'` first, but Cairo is not loaded. If any component references the token directly, Cairo will fall through to Tajawal (acceptable, but the token is misleading).

**Fix needed (minor):** Remove `'Cairo'` from `--font-family-arabic` since it is not loaded, or add it to the Google Fonts link.

---

## F — Mobile First / Responsive

**PASS**

`.screen` is `max-width: 520px; margin: 0 auto; padding: 16px` — effectively a centered mobile column. `.login-card` equivalent caps at `maxWidth: 420`. No horizontal-overflow-causing widths. `env(safe-area-inset-bottom)` handled in multiple places. No `@media` breakpoints needed for this single-column mobile PWA. Child tabs use `overflow-x: auto` with hidden scrollbar for horizontal scroll — correct pattern.

---

## G — Admin Timetable at 375px

**PARTIAL**

`.he-period-row` uses `grid-template-columns: auto 1fr`. Meta cell has `min-width: 88px; max-width: 120px`. At 375px with 16px padding each side, available width is 343px. Meta takes ~88px; input cell gets ~255px — workable. However:
- `.homework-entry` has no `max-width` or padding of its own; it inherits the parent AdminShell's layout. If AdminShell adds no padding, on wider screens the timetable stretches to full width, which should be fine.
- The meta cell's `border-left: 1px solid var(--border)` correctly puts the separator on the correct RTL side (between meta on right and textarea on left).

At 320px: meta 88px + 32px padding = 120px for textarea — tight but still usable.

---

## H — Buttons: Loading / Disabled / Touch Targets

**PARTIAL**

- Loading states: Main login button shows `<Spinner>` — PASS. HomeworkEntry action buttons show `'…'` text — minimal but functional.
- Disabled states: `opacity: .4` on disabled buttons — PASS.
- Touch targets: Global `button` rule has `padding: 14px 16px` ensuring ~45px height — PASS for primary buttons.
- **FAIL:** `.he-attach-del` has `padding: 0 2px; font-size: .9rem; line-height: 1` — touch target is approximately 18×18px, well below the 44px minimum. Same issue with `.attach-del`.

**Fix needed:**
```css
.he-attach-del {
  padding: 4px 8px;   /* lift to ~30px; wrap in a 44px zone via min-width/height */
  min-width: 32px;
  min-height: 32px;
}
```

---

## I — Form Inputs: Labels / Placeholders / Validation

**PASS**

Login.tsx has visible Arabic labels ("رقم الهاتف", "رمز PIN") as `<label>` elements above inputs. Placeholders are Arabic/numeric (07XXXXXXXXX, ••••••). `required` attributes present. `autoComplete` set correctly. HomeworkEntry uses `aria-label` on section `<select>`. Textarea placeholders are Arabic ("نص الواجب…").

Minor: labels in Login.tsx are not associated with inputs via `for`/`id` or `htmlFor` — they are visually adjacent `<label>` elements but without explicit association.

**Fix needed (minor):**
```tsx
<label htmlFor="phone-input">رقم الهاتف</label>
<input id="phone-input" ... />
```

---

## J — Error Messages: Visibility / Contrast / ARIA

**FAIL**

Error `<p>` in Login.tsx uses `color: var(--err)` (#E5534B on #0F1E33 background). Contrast ratio ≈ 4.8:1 — passes AA for normal text. However:
- No `role="alert"` or `aria-live="polite"` on any error message — screen readers will not announce errors.
- `.slot-error` and `.import-err-row` similarly have no ARIA annotation.

**Fix needed:**
```tsx
{err && (
  <p role="alert" aria-live="polite" style={{ ... }}>
    {err}
  </p>
)}
```

---

## K — Loading Indicators

**PARTIAL**

- Initial auth check in HomeworkEntry shows `<p className="muted">جارٍ التحقق…</p>` — minimal but present.
- Period loading shows `<p className="muted">جارٍ التحميل…</p>` — no skeleton, just text.
- Skeleton CSS (`.hw-skeleton`, `.skel-line`) is defined in styles.css and appears used by the Today page (guardian view).
- Spinner component is used in Login. Async button operations use '…' text only.

No loading state issues that block usability, but for the homework timetable a skeleton matching the 6-period grid would reduce layout shift.

---

## L — Status Badges

**PASS**

All three states are styled:
- `.he-status--published`: `var(--success-bg)` background, `var(--success)` text, solid `var(--success)` border.
- `.he-status--draft`: `var(--warn-bg)` background, `var(--warn)` text, solid `var(--warn)` border.
- `.he-status--empty`: muted translucent background, `var(--muted)` text, `var(--border)` border.

The `StatusDot` component in HomeworkEntry correctly maps all four status values (`null` renders as empty).

---

## M — Attachment Chips

**FAIL**

`.he-attach-chip` uses `background: var(--surface2)` — but `--surface2` is NOT defined anywhere in styles.css. The second `:root` block defines `--surface3: #1A2E4A` but not `--surface2`. This means the chip background falls back to `transparent` or `unset`, making chips potentially invisible against the textarea background.

**Fix needed:** Add to `:root`:
```css
--surface2: #162030;
```
Or change `.he-attach-chip` to use an existing token:
```css
background: var(--card2);
```

---

## N — Toast

**PARTIAL**

Toast is `position: fixed; bottom: max(1.5rem, env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%)` — centered above bottom safe area. Auto-dismiss at 3 seconds with 300ms fade-out. Z-index 9999.

Issues:
- No `role="alert"` or `aria-live="assertive"` — screen readers will not announce toasts.
- `whiteSpace: 'nowrap'` with `maxWidth: '90vw'` — long Arabic messages may clip. Should use `whiteSpace: 'normal'` and `wordBreak: 'break-word'` instead.

**Fix needed:**
```tsx
<div role="alert" aria-live="assertive" style={{ ..., whiteSpace: 'normal', wordBreak: 'break-word' }}>
```

---

## O — Icons / School Logo

**PASS**

index.html references `/icon-192.png` (favicon) and `/apple-touch-icon.png`. Login.tsx renders the school logo `<img src="/icon-192.png" alt="واجباتي" width={72} height={72}>`. PWA manifest references icon-192 and icon-512 with `purpose: 'any maskable'`. Per AGENTS.md (§8), real school logo icons were merged in PR #4.

---

## P — Navigation: Admin Back Button / Header

**PARTIAL**

`PageHeader` component exists with sticky top positioning, title, subtitle, and actions slot — ready for use. AdminShell presumably renders page navigation. HomeworkEntry itself does not render a back button or breadcrumb; it depends on AdminShell for chrome.

Without reading AdminShell, navigation adequacy is unconfirmed. If AdminShell provides tab navigation between homework/notices/import, no per-page back button is needed.

---

## Q — Accessibility: ARIA / Keyboard / Focus

**PARTIAL**

Present:
- `aria-label` on DateNavigator prev/next buttons.
- `aria-label` on period circle in HomeworkCard.
- `aria-label="حذف المرفق"` on attachment delete button.
- `aria-label="اختر الشعبة"` on section select.

Missing:
- No `role="alert"` / `aria-live` on error messages or toast (see J and N).
- Labels in Login are not associated with inputs via `htmlFor`/`id`.
- Focus indicators: `.search-input:focus` changes border color — visible. `.hw-textarea:focus` changes border color. Global `button` has no `:focus-visible` ring. Missing explicit `:focus-visible` outline on buttons reduces keyboard navigation visibility.

**Fix needed:**
```css
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

---

## R — Width Test: 375px / 320px

**PASS**

- `.screen` max-width 520px with 16px side padding works at all widths.
- `.child-tabs` scrolls horizontally without overflow.
- `.he-timetable` grid at 375px: adequate (see G).
- `.cal-grid` 7-column at 320px: each cell is (320-32-28)/7 ≈ 37px — tight but passable for the calendar.
- `.bottom-bar` uses `inset-inline: 0` (logical property) — correct RTL behavior.
- No fixed pixel widths wider than viewport found.

---

## S — he-retry-btn: Dashed Warning Border

**PASS**

```css
.he-retry-btn {
  border: 1px dashed var(--warning, #E8B04A);
  color: var(--warning, #E8B04A);
}
```

Dashed warning-colored border is present. The `var(--warning, #E8B04A)` fallback is correct since `--warning` is not in the token set (the token is `--warn`). The fallback hardcode `#E8B04A` matches the accent so it works — but should reference `--warn` or `--accent` for consistency:

```css
border: 1px dashed var(--warn, #E8B04A);
color: var(--warn, #E8B04A);
```

---

## Summary Table

| # | Item | Result |
|---|------|--------|
| A | Design tokens — two conflicting :root sets | PARTIAL |
| B | Dark/light mode — [data-theme] only covers --color-* not shorthand tokens | PARTIAL |
| C | Color palette matches spec | PASS |
| D | Arabic RTL — dir="rtl" root, correct flow | PASS |
| E | Font stack — Cairo in token but not loaded | PARTIAL |
| F | Mobile-first layout | PASS |
| G | Admin timetable at 375px | PARTIAL |
| H | Touch targets — attach-del too small | PARTIAL |
| I | Form labels/placeholders | PASS |
| J | Error messages missing role="alert" | FAIL |
| K | Loading indicators — no skeleton for timetable | PARTIAL |
| L | Status badges all styled | PASS |
| M | --surface2 undefined — attach chip invisible bg | FAIL |
| N | Toast missing role="alert", nowrap on long text | PARTIAL |
| O | School logo icons present | PASS |
| P | Admin navigation / PageHeader | PARTIAL |
| Q | ARIA/focus-visible gaps | PARTIAL |
| R | No horizontal scroll at 375px/320px | PASS |
| S | he-retry-btn dashed warning border | PASS |

---

## Required CSS / Code Fixes

Ordered by severity:

### 1. Define missing --surface2 token (FAIL)
File: `src/styles.css`, second `:root` block
```css
--surface2: #162030;
```

### 2. Add role="alert" to Toast (FAIL/PARTIAL)
File: `src/components/Toast.tsx`
```tsx
<div role="alert" aria-live="assertive" style={{ ..., whiteSpace: 'normal', wordBreak: 'break-word' }}>
```

### 3. Add aria-live to error messages (FAIL)
File: `src/pages/Login.tsx` (and any other error `<p>`)
```tsx
<p role="alert" style={...}>{err}</p>
```

### 4. Increase touch target for attachment delete buttons (PARTIAL)
File: `src/styles.css`
```css
.he-attach-del {
  padding: 4px 8px;
  min-width: 28px;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### 5. Add focus-visible ring for keyboard users (PARTIAL)
File: `src/styles.css`
```css
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### 6. Associate Login form labels with inputs (PARTIAL)
File: `src/pages/Login.tsx`
```tsx
<label htmlFor="phone-input" ...>رقم الهاتف</label>
<input id="phone-input" ... />
<label htmlFor="pin-input" ...>رمز PIN</label>
<input id="pin-input" ... />
```

### 7. Fix --surface2 fallback vs --warn in he-retry-btn (minor)
File: `src/styles.css`
```css
.he-retry-btn {
  border: 1px dashed var(--warn, #E8B04A);
  color: var(--warn, #E8B04A);
}
```

### 8. Fix .select arrow position for RTL (minor)
File: `src/styles.css`
```css
.select {
  background-position: right .75rem center;  /* was: left */
  padding-right: 2.5rem;                      /* was: padding-left */
  padding-left: 0;
}
```

### 9. Remove 'Cairo' from --font-family-arabic token or load it (minor)
File: `src/styles.css`
```css
--font-family-arabic: 'Tajawal', 'IBM Plex Sans Arabic', system-ui, sans-serif;
```

---

## Out of Scope (No Action)

The following items were reviewed and require no CSS changes:
- Overall palette and visual consistency: solid dark-navy studio aesthetic maintained throughout.
- RTL text direction: correctly applied at all levels.
- PWA manifest: matches brand spec.
- Skeleton animation keyframes: defined and functional.
- Bottom bar `inset-inline: 0`: correct logical property for RTL.
- Safe area insets: handled in all scroll containers and fixed bars.

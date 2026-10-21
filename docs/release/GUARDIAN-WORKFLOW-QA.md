I now have all the information needed to produce the complete QA report.

# Guardian Workflow QA — WAJIBATI PWA

**Audit date:** 2026-10-21
**Auditor:** AGENT 04 — Guardian Experience Specialist
**Method:** Static code analysis (no live environment)

---

## Critical Finding

**Today.tsx is NOT a stub.** It is a fully-implemented guardian view. This is the primary good-news finding of this audit.

---

## A) Login Flow

**PASS**

- `Login.tsx` collects phone number and 6-digit PIN.
- Calls `phoneToEmail(phone)` from `src/lib/supabase.ts`, which normalizes Iraqi phone formats (`07XXXXXXXXX`, `9647XXXXXXXXX`, `7XXXXXXXXX`) to `+964...` E.164, strips the `+`, and appends `@guardian.rumaila.local`.
- Calls `supabase.auth.signInWithPassword({ email, password: pin })`.
- On success: redirects to `/` (Today view).
- On error: displays Arabic message "رقم الهاتف أو الرمز غير صحيح" with no error code leakage.
- Loading state: Spinner component shown on submit button while request is in flight.
- `supabase.ts` client initializes with `persistSession: true, autoRefreshToken: true`.

---

## B) Today View

**PASS — Fully Implemented**

`src/pages/Today.tsx` (586 lines) contains a complete guardian daily view with: child selector tabs, date navigation, calendar popup with homework-day dots, section badge, push opt-in banner, full-text search bar, notices section, homework card list with per-card subject/period/teacher/body/attachments, skeleton loaders, empty state, offline indicator, A4 PNG export, and a bottom nav bar linking to `/archive`. Not a stub in any sense.

---

## C) Section Access (RLS Enforced)

**PASS — Double enforcement**

DB level (`init.sql` line 241):
```sql
create policy g_sections on sections for select
  using (id in (select my_section_ids()));
```
`my_section_ids()` is a `security definer` function that joins `guardians → guardian_students → students → sections` filtering for `g.user_id = auth.uid()` and both `g.active` and `s.active`.

App level (`Today.tsx`): `bootstrap()` fetches `guardian_students` scoped to the current session, so the child selector only populates with the authenticated guardian's own children.

---

## D) Published Homework Only (No Drafts Visible)

**PASS — Double enforcement**

DB level (`init.sql` line 243):
```sql
create policy g_homework on homework for select
  using (status = 'published' and section_id in (select my_section_ids()));
```

App level (`useHomework.ts` line 64):
```ts
.eq('status', 'published')
```

Both layers independently enforce this. A guardian cannot see draft homework even if they craft a direct Supabase query, because RLS blocks it.

---

## E) Subject Display

**PASS**

Each homework card in Today.tsx shows:
- Subject name chip with per-subject color styling (`h.subject?.name`)
- Period circle badge (`h.period`)
- Teacher name row (`h.teacher?.full_name`)
- Body text (`h.body`)

The `useHomework` hook selects `subject:subjects(name,color)` and `teacher:teachers(full_name)` via Supabase joined queries.

---

## F) Attachment Viewing

**PASS**

`Today.tsx` (lines 142–156): After homework is loaded, generates signed URLs for all attachment storage paths via `supabase.storage.from('attachments').createSignedUrls(paths, 3600)`. Attachments are rendered as `<a href={signedUrl} target="_blank">` links with image/document emoji icons.

Storage RLS (`init.sql` line 274):
```sql
create policy att_guardian on storage.objects for select
  using (bucket_id = 'attachments'
         and (split_part(name,'/',1))::int in (select my_section_ids()));
```

Error on signed URL generation shows toast: "فشل تحميل المرفقات — حاول مجدداً".

---

## G) Date Navigation

**PASS**

`DateNavigator` component used with `stepDay()` helper that skips Fridays (weekday 5) and Saturdays (weekday 6) when stepping backward/forward. Initial date on mount defaults to today if a school day, otherwise steps back to the last school day.

Calendar popup fetches `homework.due_date` values for the displayed month (published, for the selected section) and marks them with dot indicators. Calendar header localizes month/year to Arabic-IQ locale.

---

## H) Archive

**PASS**

`src/pages/Archive.tsx` is fully implemented:
- Loads all guardian's sections from `guardian_students`.
- Fetches published homework with pagination (20 items/page) sorted `due_date DESC`.
- Full-text search via `textSearch('search', query)` with graceful fallback to `ilike` on error code `42703`.
- Section selector tabs for guardians with multiple children.
- "Load more" button with spinner.
- Skeleton loaders and empty state component.
- Navigation back to Today view and sign-out button.
- Accessible from Today.tsx via bottom nav `<Link to="/archive">الأرشيف</Link>`.

---

## I) Empty States

**PASS**

Today.tsx (line 518–523):
```jsx
<div className="empty-state">
  <span className="empty-icon" aria-hidden="true">📚</span>
  <p className="empty-msg">لا توجد واجبات لهذا اليوم</p>
</div>
```

Archive.tsx uses `<EmptyState icon="📭" title="لا واجبات هنا" subtitle={...} />` component with context-aware subtitle (different message for search vs. no data).

No-children state in Today.tsx: "لا أبناء مرتبطون بهذا الحساب".

---

## J) Error States / Network Failure

**PARTIAL FAIL**

`useHomework.ts` implements offline cache fallback:
1. On fetch failure, reads `rh_cache` from `localStorage`.
2. If cache matches current `date` + `sectionId`, shows cached homework and sets `offline: true`.
3. If cache mismatches, sets `error: 'فشل تحميل البيانات'` and returns empty items.

**Bug:** `Today.tsx` renders the `offline` indicator (`⚠️ عرض مؤقت بدون اتصال`) but **never reads or renders the `error` field** returned by `useHomework`. When the network fails and no matching cache exists, the page shows the empty state ("لا توجد واجبات لهذا اليوم") rather than an error message. The user receives a false signal that there is simply no homework, not that the fetch failed.

Archive.tsx has no offline fallback or error state at all — a network failure in the archive silently shows the empty state.

---

## K) Session Expiry

**BLOCKED (PARTIAL)**

`supabase.ts` configures `autoRefreshToken: true`, so Supabase will attempt to refresh the JWT before it expires. On cold mount, `Today.tsx` checks `supabase.auth.getSession()` and redirects to `/login` if no session exists.

However, Today.tsx and Archive.tsx have **no `onAuthStateChange` subscription**. If a token refresh fails mid-session (no network, revoked refresh token), the page does not auto-redirect to login — it will silently fail on the next data fetch. The behavior depends on Supabase's refresh window (default 1 hour JWT + 1 week refresh token), so this is unlikely in practice but not guarded against in code.

---

## L) Mark Read

**PASS**

`useHomework.ts` (lines 83–86):
```ts
supabase.rpc('mark_read', { p_section: sec, p_day: date }).then(
  () => {},
  () => {},
)
```

Called as a non-critical side effect after every successful homework fetch. The DB function `mark_read` validates the guardian owns the section before inserting into `reads`. Errors are silently swallowed (intentional per the "non-critical" comment).

---

## M) Push Notifications

**PASS (with dead-code note)**

Today.tsx implements push opt-in inline:
- Banner shown when `Notification.permission === 'default'`.
- `enablePush()` calls `navigator.serviceWorker.ready`, then `pushManager.subscribe()` with the VAPID public key from `VITE_VAPID_PUBLIC_KEY`.
- Upserts subscription to `push_subscriptions` table with `onConflict: 'endpoint'`.
- State cycles `'pending' → 'granted'` on success.

**Note:** `src/hooks/usePushSubscription.ts` is a complete, separate push subscription hook that is **never imported or used anywhere** in the application. It is dead code. It also has a `section_id` parameter that the inline Today.tsx implementation does not pass (Today.tsx omits `section_id` from the upsert). The hook's schema includes `section_id` while the DB schema for `push_subscriptions` does not have a `section_id` column in the migration — this would cause a runtime error if the hook were ever invoked.

---

## N) Mobile Experience

**PASS**

- Login.tsx: uses `safe-area-inset-*` CSS env vars on all four sides, `max-width: 420`, centered flex layout.
- Today.tsx: `dir="rtl"` on main, mobile-first CSS class names (`screen`, `today-header`, `hw-card`), Arabic locale date formatting with `ar-IQ`.
- Archive.tsx: `max-width: 520`, `padding: '0 0 env(safe-area-inset-bottom)'`, sticky header at `top: 0`.
- `index.html` has RTL shell and proper viewport meta implied by Vite PWA setup.

---

## Summary Table

| Item | Check | Status |
|------|-------|--------|
| A | Login flow (phone → email → Supabase auth → redirect) | PASS |
| B | Today.tsx — stub or implemented? | PASS (fully implemented) |
| C | Section access scoped to guardian's sections | PASS |
| D | Only published homework visible (not draft) | PASS |
| E | Subject name, period, homework body displayed | PASS |
| F | Attachment viewing via signed URLs | PASS |
| G | Date navigation with school-day-aware stepping | PASS |
| H | Archive page accessible and functional | PASS |
| I | Empty state when no homework | PASS |
| J | Network failure / error state | PARTIAL FAIL — `error` from `useHomework` never rendered in Today.tsx; Archive has no offline fallback |
| K | Session expiry handling | BLOCKED — auto-refresh configured but no `onAuthStateChange` listener |
| L | mark_read RPC called on view | PASS |
| M | Push notification opt-in UI | PASS (dead-code: `usePushSubscription.ts` hook unused) |
| N | Mobile-first RTL styling | PASS |

---

## Issues to Address Before Release

1. **MEDIUM — Error state not rendered (Today.tsx):** The `error` field from `useHomework` is destructured but never displayed. When a network failure occurs with no matching cache, the guardian sees the empty homework state instead of "فشل تحميل البيانات". File: `src/pages/Today.tsx`, line 82.

2. **MEDIUM — Archive has no auth guard or error state:** `Archive.tsx` does not check session on mount and has no error handling for failed fetches. A logged-out user hitting `/archive` directly gets a blank page.

3. **LOW — Dead code: `usePushSubscription.ts` hook:** Never imported or used. The hook's interface includes a `section_id` parameter that conflicts with the actual DB schema (no `section_id` column on `push_subscriptions`). File: `src/hooks/usePushSubscription.ts`.

4. **LOW — No `onAuthStateChange` subscription:** Neither Today.tsx nor Archive.tsx listens for auth state changes. A refresh-token failure mid-session will not auto-redirect to login.

5. **LOW — `hw-read-check` checkmark is static:** The ✓ checkmark on each homework card (`hw-read-check`) is always rendered and does not reflect whether the guardian actually has a `reads` row for that day. This may mislead guardians.

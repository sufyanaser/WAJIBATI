I now have all files needed for a thorough analysis. Here is the complete QA report:

---

# Admin Workflow QA Report
**Date:** 2026-10-21
**Agent:** AGENT 03 — Admin Workflow Specialist
**Method:** Static code analysis of src/pages/admin/, src/hooks/useAdminSection.ts, src/components/DateNavigator.tsx, src/components/Toast.tsx, src/App.tsx, src/pages/AdminLogin.tsx

---

## A) Admin Login — FAIL

**File:** `src/pages/AdminLogin.tsx` line 17

**Bug:** The admins table query is missing the `user_id` filter:

```ts
const { data } = await supabase.from('admins').select('role').maybeSingle()
```

All other admin pages (HomeworkEntry, NoticesPage, ImportPage) correctly use:

```ts
.eq('user_id', data.session.user.id)
```

**Impact:** If RLS allows an admin to see more than one row (e.g. an owner-role admin with a policy like `is_admin()`), `maybeSingle()` returns an error when multiple rows exist. The code destructures only `data` and ignores `error`, so `data` is null and the legitimate admin is signed out with "ليس لديك صلاحية الدخول كمدير". Depending on RLS policy, this blocks all admins except in single-admin deployments.

**Fix:** Add `.eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')` before `.maybeSingle()`, or retrieve the session first and use its `user.id`.

---

## B) Section Selector — PASS

**File:** `src/pages/admin/HomeworkEntry.tsx` lines 148–159, JSX lines 212–223

Sections are loaded from Supabase with `stage:stages(name, branch)` joined, ordered by `letter`. Display shows `stage.name stage.branch / letter`. Default selection is `data[0].id` (first alphabetically). `setSecId` on `onChange` triggers the `useAdminSection` hook reload via changed `sectionId` dependency. No issues found.

---

## C) Date Navigator — PASS

**File:** `src/components/DateNavigator.tsx`

`stepDay` loops with `do { r.setDate(r.getDate() + dir) } while (!isSchool(r))`. `isSchool` returns false for `getDay() === 5` (Friday) and `getDay() === 6` (Saturday). Correctly skips weekends for both directions. Date label uses `ar-IQ` locale with `weekday: 'long'`. Today is highlighted with accent color. The `firstWorkday` helper in `HomeworkEntry.tsx` correctly advances Friday by +2 days and Saturday by +1 day for the initial state.

---

## D) Period Display — PASS

**File:** `src/pages/admin/HomeworkEntry.tsx` lines 252–265

Renders: `حصة {slot.period}` for the period number, `slot.subject` for subject name (if present), `slot.teacher` for teacher name (if present), `<StatusDot>` for status. `StatusDot` covers `published`, `draft`, and null (empty). No issues found.

---

## E) Homework Entry (textarea) — PASS

**File:** `src/pages/admin/HomeworkEntry.tsx` line 273; `src/hooks/useAdminSection.ts` lines 121–128

`onChange` calls `setBodies({ [slot.period]: e.target.value })`. `setBodies` merges into `bodyOverrides` via spread. `periodsWithOverrides` applies overrides per period. Trimming happens in `upsertAll` (`body.trim()`). Empty body causes `continue` (skip). No issues found.

---

## F) Draft Save — PASS

**File:** `src/pages/admin/HomeworkEntry.tsx` lines 166–179; `src/hooks/useAdminSection.ts` lines 130–202

`handleSaveDraft` calls `save()` → `upsertAll('draft')`. Returns `SaveResult` with `saved`, `failed`, `errors[]`. Toast logic:
- Partial failure: error toast with count and first error message.
- Full success: success toast.
- Unexpected exception: error toast via catch block.

Buttons disabled during save (`saving || publishing || loading`). No issues found.

---

## G) Publish All — PASS

**File:** `src/pages/admin/HomeworkEntry.tsx` lines 181–198; `src/hooks/useAdminSection.ts` lines 296–322

`handlePublish` calls `publish()` → `upsertAll('published')` then invokes `send-push` edge function. Toast outcomes cover all four states:
1. `saved === 0` → error (nothing to push)
2. `failed > 0` → error with counts
3. `!pushSent` → info (saved but push failed)
4. Full success → success with count

Exception caught at both save level (`upsertAll` per-slot continue) and push level (try/catch returns `pushSent: false`). No issues found.

---

## H) Attachment Upload — PASS

**File:** `src/hooks/useAdminSection.ts` lines 204–253

File type validated against `ALLOWED_TYPES = ['image/jpeg','image/png','image/webp','application/pdf']`. Size validated against `MAX_BYTES = 5 * 1024 * 1024`. `hw_id` checked before upload (`if (!slot?.hw_id) return { ok: false, error: 'احفظ الواجب أولاً' }`). Upload button in `AttachmentChips` is disabled when `!hwId`. If storage upload succeeds but DB insert fails, the code cleans up the orphaned storage file. No issues found.

---

## I) Attachment Delete — PARTIAL

**File:** `src/hooks/useAdminSection.ts` lines 256–293; `src/pages/admin/HomeworkEntry.tsx` lines 43–47

**Issue 1 — Not optimistic UI.** The UI chip is only removed after both the DB delete and storage delete succeed (or after DB delete even if storage fails). No chip is removed optimistically before any network call. This is a design choice but is documented here; it means a slow delete shows the chip as "deleting" (spinner) for the full round-trip.

**Issue 2 — No error toast surfaced to user on delete failure.** In `AttachmentChips.handleDelete`:

```ts
async function handleDelete(id: string, path: string) {
  setBusy(id)
  await onDelete(period, id, path)  // result ignored
  setBusy(null)
}
```

The `{ ok, error }` result is not inspected. If `deleteAttachment` returns `{ ok: false, error: '...' }` (e.g. DB delete fails), the error is silently swallowed — the chip reappears (busy clears) with no toast explaining why. The `showToast` prop is available in `AttachmentChips` but unused in `handleDelete`.

**Fix:** Check the result and call `showToast(result.error!, 'error')` when `!result.ok`.

---

## J) Retry Failed Upload — PASS

**File:** `src/pages/admin/HomeworkEntry.tsx` lines 27, 76–95

`failedFile` state stores `{ file: File; error: string }`. On failure, `setFailedFile({ file: files[0], error: result.error ?? 'فشل الرفع' })`. A retry button is rendered when `failedFile` is truthy. Retry re-calls `onUpload(period, failedFile.file)` with the stored `File` object. On retry success, `setFailedFile(null)` clears it. On retry failure, error is updated and toast shown. No issues found.

---

## K) Toast Notifications — FAIL

**File:** `src/components/Toast.tsx` lines 12–53; `src/components/Toast.tsx` lines 55–60

**Bug — Timer reset on every parent re-render.** `useToast` returns `clear` as a non-memoized inline function:

```ts
const clear = () => setToast(null)
```

Every render of `HomeworkEntry` produces a new `clear` reference. `Toast` uses `onDone` in its `useEffect` dependency array:

```ts
useEffect(() => {
  const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, duration)
  return () => clearTimeout(t)
}, [duration, onDone])
```

Because `onDone` (= `clear`) is a new reference on every parent render, any re-render of `HomeworkEntry` while the toast is visible (e.g. caused by a state change from ongoing async work) restarts the 3-second countdown. A rapid sequence of re-renders can prevent the toast from ever dismissing.

**Fix:** Wrap `show` and `clear` in `useCallback` inside `useToast`, or pass `onDone` as a stable ref inside `Toast`:

```ts
const show = useCallback((message: string, type: ToastType = 'info') => setToast({ message, type }), [])
const clear = useCallback(() => setToast(null), [])
```

All `success`/`error`/`info` message types are handled. `clearToast` is correctly passed as `onDone`. The only structural issue is the timer reset.

---

## L) Loading States — PASS

**File:** `src/pages/admin/HomeworkEntry.tsx` lines 231–244

Both "حفظ مسودة" and "نشر الكل" buttons have `disabled={saving || publishing || loading}`. Button labels change to `…` during operation. Upload button: `disabled={!hwId || busy === 'upload'}`. Delete button: `disabled={busy === a.id}`. No issues found.

---

## M) Error Handling — PARTIAL

**File:** Multiple

Per-slot errors in `upsertAll` are accumulated in `result.errors[]` and shown in toast (first error message only). Outer `try/catch` in `handleSaveDraft` and `handlePublish` catches unexpected exceptions. However:

- DB or storage errors from `deleteAttachment` are not surfaced to the user (covered in item I above).
- The `load` function in `useAdminSection` has no error handling: if the Supabase queries fail, `setLoading(false)` is still called (actually it is not called if an exception is thrown before it) — but since the code uses `ttR.data ?? []` and `hwR.data ?? []`, a network error that causes `data` to be null is silently treated as empty data, with no user feedback. The UI shows an empty timetable grid instead of an error message.

**Fix for load errors:** Check `ttR.error || hwR.error` after `Promise.all` and surface a toast or error state.

---

## N) Multi-period Entry — PASS

**File:** `src/hooks/useAdminSection.ts` lines 95–110

`Array.from({ length: 6 }, (_, i) => ...)` always creates exactly 6 slots (periods 1–6). `upsertAll` iterates over all. Each slot is independently rendered with its own textarea and `AttachmentChips`. No issues found.

---

## O) Slots Without Timetable Entry — PASS

**File:** `src/hooks/useAdminSection.ts` lines 137–145

The check order is correct:
1. `if (!body) continue` — silently skips empty-body periods (correct behavior).
2. `if (!slot.subject_id)` — only reached when body is non-empty, adds to `result.errors` with message `حصة ${slot.period}: لا توجد مادة في الجدول الدراسي`.

The error message is surfaced to the user via the toast (partial-failure path). No silent failure for filled-in slots without timetable entries.

---

## Summary Table

| Item | Status | Severity |
|---|---|---|
| A) Admin Login — missing user_id filter in AdminLogin.tsx | FAIL | High |
| B) Section Selector | PASS | — |
| C) Date Navigator | PASS | — |
| D) Period Display | PASS | — |
| E) Homework Entry textarea | PASS | — |
| F) Draft Save | PASS | — |
| G) Publish All | PASS | — |
| H) Attachment Upload validation | PASS | — |
| I) Attachment Delete — error result ignored, no toast | PARTIAL | Medium |
| J) Retry Failed Upload | PASS | — |
| K) Toast timer reset due to non-memoized onDone | FAIL | Medium |
| L) Loading states / disabled buttons | PASS | — |
| M) Error handling — load() errors silently empty | PARTIAL | Low |
| N) Multi-period (all 6 periods) | PASS | — |
| O) Slots without timetable entry | PASS | — |

### Bugs Requiring Fixes (Priority Order)

1. **HIGH — `src/pages/AdminLogin.tsx` line 17:** Add `.eq('user_id', ...)` to the admins query to match the pattern used by all other admin pages and avoid potential `maybeSingle()` multi-row errors.

2. **MEDIUM — `src/pages/admin/HomeworkEntry.tsx` `handleDelete`:** Check the result of `onDelete` and call `showToast(result.error!, 'error')` when `!result.ok`.

3. **MEDIUM — `src/components/Toast.tsx` / `useToast`:** Wrap `show` and `clear` in `useCallback` so `onDone` has a stable reference across parent renders, preventing timer restart.

4. **LOW — `src/hooks/useAdminSection.ts` `load()`:** Check `ttR.error` and `hwR.error` after `Promise.all` and set an error state or call a provided `onError` callback instead of silently showing an empty grid.

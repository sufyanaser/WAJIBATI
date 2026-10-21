# WAJIBATI PWA — Final Release Readiness Report

**FINAL VERDICT: NO-GO**

Report written to: `/home/user/homeworks/.claude/worktrees/wf_f572fce4-766-1/docs/release/WAJIBATI-FINAL-READINESS.md`

---

## Evidence Gathered Independently

| Check | Source | Finding |
|---|---|---|
| Today.tsx stub vs implemented | Read file (586 lines) | CONFIRMED fully implemented. AGENT 04 correct. |
| att_guardian storage policy | `20261021100000_security_fixes.sql` lines 27–33 | CONFIRMED vulnerable: only checks `bucket_id` + `section_id`. No `status='published'` join. |
| Fix migration exists? | `ls supabase/migrations/` | 5 files. `20261021110000_fix_storage_draft_exposure.sql` IS ABSENT. |
| PR #28 open | `mcp__github__list_pull_requests` | Zero open PRs returned. AGENT 02's PR not found. |
| useHomework status filter | `useHomework.ts` line 64 | CONFIRMED: `.eq('status', 'published')`. App-layer correct. |
| jsPDF in package.json | Read file | CONFIRMED absent. AGENT 05 correct. |
| AdminLogin user_id bug | `AdminLogin.tsx` line 17 | CONFIRMED: no `.eq('user_id', ...)`. AGENT 03 correct. |
| g_homework DB policy | `init.sql` lines 243–244 | CONFIRMED correct: `status='published' AND section_id in (my_section_ids())` |
| mark_read wiring (AGENT 01 H1 disputed) | `useHomework.ts` lines 83–86 | AGENT 01 WAS WRONG — mark_read IS called via useHomework, not directly in Today.tsx. |

---

## Integrated Scenario Traces

| Scenario | Status | Evidence |
|---|---|---|
| Admin publishes → authorized guardian views homework | PASS | Double enforcement: app `.eq('status','published')` + DB `g_homework` policy |
| Authorized guardian opens attachment (published) | PASS | `createSignedUrls` + `att_guardian` section check passes |
| Unauthorized guardian (different section) accesses attachment | PASS | `att_guardian` rejects: section_id not in `my_section_ids()` |
| **Authorized guardian accesses DRAFT attachment via direct storage path** | **CRITICAL FAIL** | `att_guardian` only checks section_id; no `status='published'` join. Draft files exposed. |
| Guardian sees draft homework rows | PASS | DB `g_homework` + app filter both block it |
| Publishing works without attachment | PASS | `upsertAll` only needs `body.trim()` |
| Failed attachment upload blocks publish? | PASS | Attachment state is independent of publish flow |

---

## Critical Blockers (GO-Blocking)

**C1 — Storage draft-exposure (UNMITIGATED, CRITICAL)**
The `att_guardian` storage RLS policy checks only section ownership, not homework publication status. An authenticated guardian with knowledge of a storage path in their own section can download draft attachment files. Fix migration is absent from the codebase. Referenced PR #28 does not exist.

Required: Create and apply `supabase/migrations/20261021110000_fix_storage_draft_exposure.sql` with a 6-check policy (bucket_id, numeric guard, UUID guard, section ownership, `status='published'` EXISTS subquery, section cross-check on homework row). Run `npm run db:push`. Then verify S15/S16 on live staging.

**C2 — AdminLogin missing user_id filter (HIGH)**
`AdminLogin.tsx` line 17 calls `.maybeSingle()` without `.eq('user_id', user.id)`. In any multi-admin deployment, `maybeSingle()` returns an error when multiple rows are visible, locking all admins out. Fix: add `.eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')`.

---

## Path to GO

1. Apply the storage fix migration and run `npm run db:push` against production.
2. Fix `AdminLogin.tsx` user_id filter.
3. Manually verify S15 + S16 on a live staging Supabase instance.
4. Rotate demo PINs before real guardian enrollment.

Items H4 (security headers in `vercel.json`), H1 (Toast timer `useCallback`), H2 (`error` field not rendered in Today.tsx), H6 (`--surface2` undefined token) are recommended before first public use but do not block security clearance.

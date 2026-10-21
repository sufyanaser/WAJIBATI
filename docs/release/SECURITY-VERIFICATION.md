Draft PR created at https://github.com/sufyanaser/homeworks/pull/28.

---

## Security Verification Report

### 1. Current Policy (Exact SQL)

From `supabase/migrations/20261021100000_security_fixes.sql` (the most recent migration, overwriting the init):

```sql
create policy att_guardian on storage.objects for select
  using (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) ~ '^[0-9]+$'
    and (split_part(name, '/', 1))::int in (select my_section_ids())
  );
```

### 2. Vulnerability Analysis

**Severity: CRITICAL**

The policy scopes storage access to the guardian's own sections only by checking the first path segment (`section_id`). It does not inspect the second segment (`homework_id`) or join `public.homework` to verify `status = 'published'`.

A guardian who knows or guesses the path format `<section_id>/<homework_id>/<uuid>.<ext>` can call the Supabase Storage API directly (e.g. `supabase.storage.from('attachments').download(path)` or a signed-URL request) and retrieve attachment files belonging to **draft** or **archived** homework in any of their sections.

The DB-level `g_attach` policy on `public.attachments` correctly blocks this via `h.status = 'published'`, but the Storage engine evaluates `storage.objects` RLS independently — it never queries `public.attachments`, so that table's policy offers no protection for direct storage calls.

### 3. Fix SQL (Exact)

File: `/home/user/homeworks/.claude/worktrees/wf_ece8d71f-b7e-2/supabase/migrations/20261021110000_fix_storage_draft_exposure.sql`

```sql
drop policy if exists att_guardian on storage.objects;

create policy att_guardian on storage.objects for select
  using (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) ~ '^[0-9]+$'
    and split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (split_part(name, '/', 1))::int in (select my_section_ids())
    and exists (
      select 1 from public.homework h
      where h.id      = (split_part(name, '/', 2))::uuid
        and h.status  = 'published'
        and h.section_id = (split_part(name, '/', 1))::int
    )
  );

create index if not exists idx_attachments_homework_id
  on attachments(homework_id);
```

### 4. Logic Verification

| Check | Clause | Verdict |
|-------|--------|---------|
| Correct bucket | `bucket_id = 'attachments'` | PASS — prevents cross-bucket access |
| Numeric guard on section_id | `~ '^[0-9]+$'` before `::int` cast | PASS — prevents cast error on malformed paths |
| UUID guard on homework_id | `~ '^[0-9a-f]{8}-...$'` before `::uuid` cast | PASS — prevents cast error on malformed paths |
| Guardian owns section | `...::int in (select my_section_ids())` | PASS — scopes to guardian's children |
| Homework published | `h.status = 'published'` | PASS — THE CRITICAL FIX |
| Section cross-check on homework row | `h.section_id = ...::int` | PASS — prevents spoofed UUID pointing to another section's homework |

All six required checks are present and logically correct.

### 5. PR Link

**Draft PR #28:** https://github.com/sufyanaser/homeworks/pull/28
**Branch:** `fix/storage-rls-security`
**Commit:** `c53bf16`

DO NOT MERGE — owner must apply to staging, verify S15/S16, then approve.

### 6. Test Scenarios S15/S16 Status

| Scenario | Status | Reason |
|----------|--------|--------|
| S15: Draft homework not shown to guardians (useHomework) | **BLOCKED** | Cannot confirm without a live Supabase instance. The `g_homework` DB policy is statically correct (`status = 'published' AND section_id in my_section_ids()`), but end-to-end app-layer behavior of `useHomework.ts` is unverified. |
| S16: Cross-section isolation via storage | **BLOCKED** | Requires live staging to confirm `my_section_ids()` returns correct IDs for a given session token, and that the new EXISTS subquery evaluates as expected under the Supabase Storage RLS engine. |

### 7. Other RLS Findings

| Policy | Object | Assessment |
|--------|--------|------------|
| `g_homework` on `homework` | DB table | CORRECT — `status = 'published' AND section_id in (select my_section_ids())` |
| `g_attach` on `attachments` | DB table | CORRECT — EXISTS subquery checks `h.status = 'published'` AND `h.section_id in my_section_ids()` |
| `g_sections` on `sections` | DB table | CORRECT — `id in (select my_section_ids())` |
| `att_admin` on `storage.objects` | Storage | CORRECT — full access gated by `is_admin()` |
| `att_guardian` on `storage.objects` | Storage | VULNERABLE (this PR fixes it) |
| `staff_read` / `admin_write` | all tables | CORRECT — standard pattern |
| `attachments(homework_id)` index | DB | MISSING — added in this migration |

**Additional note on `supabase.ts`:** The client is correctly constructed using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only — no service-role key or VAPID private key is present in the client bundle. Auth, storage and PostgREST calls all run under the anon/guardian JWT, meaning storage RLS policies are correctly enforced.

### 8. Remaining Risks

- **S15/S16 BLOCKED** — `useHomework.ts` and `my_section_ids()` behavior require live staging verification before declaring GO.
- **Storage orphans (upload race)** — if the browser closes between storage upload and DB insert, no cleanup runs. Requires a periodic scheduled GC function.
- **Storage orphans (delete)** — `storage.remove()` failure is logged but not retried or alerted. Logged orphans require manual GC.
- **Demo PINs** — `20261021020000_seed_demo.sql` seeds guardians with PINs 111111–555555. Must be rotated before production deployment.
- **Draft exposure (UNMITIGATED until migration applied)** — the fix is committed and the PR is open, but the migration has not been applied to the production Supabase project. The vulnerability remains active in production until `npm run db:push` is run against the production project after owner approval.

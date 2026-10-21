# Codex Task — rumaila-homework

Read `AGENTS.md` first. Work on branch `dev`, open PR to `main`.

## Phase 0 — Verify infra (no code changes)
1. `git remote -v` → origin = github.com/sufyanaser/rumaila-homework; `main` and `dev` pushed.
2. `supabase projects list` → `rumaila-homework` ACTIVE_HEALTHY; `supabase migration list --linked` shows `20261021000000` applied.
3. `supabase functions list --project-ref <ref>` → `send-push` ACTIVE; `supabase secrets list` has the 3 VAPID secrets.
4. `vercel ls rumaila-homework` → latest production deployment READY; `vercel env ls` has the 3 `VITE_*` vars for production + preview.
5. `gh secret list` → `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.
6. Open production URL → `/login` renders RTL; manifest + sw.js 200.
If anything is missing: re-run `DBPASS=... SUPABASE_ACCESS_TOKEN=... ./scripts/bootstrap.sh` (idempotent). Report results as a checklist.

## Phase 1 — Guardian app
- `Today`: children list (via `guardian_students`), per-section homework for selected date grouped by period/subject (subject color chip), attachments (signed URLs), notices; call `mark_read`.
- Date navigation (prev/next school day, skip Fri/Sat) + archive calendar + full-text search (`homework.search`).
- Push opt-in: register `PushManager` with `VITE_VAPID_PUBLIC_KEY`, upsert `push_subscriptions`.
- Offline: last viewed day cached by SW.

## Phase 2 — Admin
- `/admin` guarded by `is_admin()`.
- Day board: pick section + date → rows prefilled from `timetable` → type homework body → publish (batch insert) → invoke `send-push` with section_id.
- Attachments upload to `attachments/<section_id>/<homework_id>/`.
- Notices CRUD.

## Phase 3 — Onboarding tools
- `scripts/import.ts` (service role): import students + guardians from `.ods`/`.csv`, create auth users (`<digits>@guardian.rumaila.local`), random 6-digit PIN, export PIN sheet `.ods`.
- PIN reset edge function (admin only).

## Done criteria per phase
`npm run build` green · RLS verified with a guardian JWT (sees only own sections) · Preview URL tested on mobile · PR description lists migrations + env changes.

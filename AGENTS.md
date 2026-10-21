# AGENTS.md — rumaila-homework

Context file for coding agents (Codex / Claude / Copilot). Read fully before any change.

## 1. Product
Daily homework PWA for **اعدادية الرميلة للبنين** (Ramadi, Anbar, Iraq).
- **School admin/supervisor** enters each section's daily homework (per subject/teacher/period), notices, and tasks.
- **Guardians (أولياء الأمور)** log in with phone + 6-digit PIN, see homework by date, browse the full archive, receive Web Push alerts.
- Past homework is never deleted (status `archived`), always reachable by date/search.
- UI language: Arabic, `dir="rtl"`, mobile-first. Weekdays الأحد→الخميس (0–4), 6 periods/day.
- Owner: Sufyan Naser Ali — sufyanaser@gmail.com

## 2. Stack
| Layer | Tech |
|---|---|
| Frontend | Vite 5 + React 18 + TypeScript (strict) + react-router-dom 6 |
| PWA | vite-plugin-pwa (`injectManifest`, `src/sw.ts`) — precache + `push` / `notificationclick` |
| Backend | Supabase: Postgres + RLS, Auth (email/password), Storage, Edge Functions (Deno) |
| Push | Web Push / VAPID via Edge Function `send-push` (no Firebase) |
| Hosting | Vercel (git-connected): `main` → production, `dev` → preview |
| CI | GitHub Actions: `ci.yml` build on every push/PR; `supabase.yml` db push + fn deploy on `supabase/**` changes to `main` |
| Region | Supabase `eu-central-1` |

## 3. Layout
```
index.html                 RTL shell, icons
vite.config.ts             PWA manifest (name واجبات الرميلة, theme #1F3A5F, bg #0F1E33)
vercel.json                SPA rewrites; sw.js no-cache
src/main.tsx, App.tsx      router: /login, /* → Today
src/lib/supabase.ts        client (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
src/pages/Login.tsx        phone + PIN login
src/pages/Today.tsx        STUB — guardian daily view (to build)
src/sw.ts                  service worker (precache, push, click)
supabase/migrations/20261021000000_init.sql   full schema + RLS + storage
supabase/functions/send-push/index.ts         Web Push fan-out to section guardians, prunes dead subs (404/410)
scripts/bootstrap.sh       one-time infra provisioning (idempotent)
.github/workflows/         ci.yml, supabase.yml
public/                    icon-192/512, apple-touch-icon (PLACEHOLDERS — replace with school logo)
```

## 4. Data model (see migration for truth)
- Reference: `academic_years` (one `is_current`), `stages` (الرابع/الخامس/السادس × علمي/أدبي), `sections` (year+stage+letter), `subjects`, `teachers`, `timetable` (section × weekday 0–4 × period 1–6).
- People: `students` → `sections`; `guardians` (phone `^\+9647[0-9]{9}$`, `user_id` → auth.users); `guardian_students` (M:N); `admins` (role `owner|editor|viewer`).
- Content: `homework` (section, subject, teacher, `due_date`, period, body, status `draft|published|archived`, generated `search` tsvector), `attachments` (storage path `<section_id>/<homework_id>/<file>`), `notices`, `reads`, `push_subscriptions`, `settings`.
- Helpers: `is_admin()`, `is_staff()`, `my_guardian_id()`, `my_section_ids()`, `mark_read(p_section, p_day)`; `homework.updated_at` trigger.
- Storage buckets: `attachments` (private; admin write, guardian read for own sections), `branding` (public).

### Auth convention (do not change without migration)
Guardian login = Supabase email/password where
`email = <phone digits without +>@guardian.rumaila.local`, `password = 6-digit PIN`. No SMS provider.
Admin = auth user with a row in `public.admins`.

## 5. Env
Client (Vercel + `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`
Server only (never `VITE_`): `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
Supabase function secrets: `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (+ built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`

## 6. Commands
```bash
npm i
npm run dev            # local
npm run build          # tsc -b && vite build (must pass before commit)
npm run lint           # tsc --noEmit
npm run db:push        # apply migrations to linked project
npm run db:types       # regen src/lib/database.types.ts
npm run fn:deploy      # deploy send-push
DBPASS=... SUPABASE_ACCESS_TOKEN=... ./scripts/bootstrap.sh   # infra, idempotent, non-interactive
```

## 7. Rules
- Minimal targeted edits; don't rewrite unrelated files.
- Schema changes = NEW migration file `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`. Never edit the applied init migration.
- Every new table: RLS enabled + explicit policies (guardian read scoped via `my_section_ids()` / `my_guardian_id()`, admin write via `is_admin()`).
- Never expose service-role key or VAPID private key to the client bundle.
- Arabic RTL UI; technical identifiers in English. Dark navy studio palette (#0F1E33 / #1F3A5F, accent #E8B04A).
- Branches: work on `dev` → PR to `main`. Conventional commits (`feat:`, `fix:`, `chore:`).
- `npm run build` green before any commit.

## 8. Status (2026-10-21)
- [x] Scaffold, schema + RLS + storage, `send-push`, CI, Vercel config, bootstrap script
- [x] Demo seed migration (`20261021020000_seed_demo.sql`) — 7 sections, 5 demo guardians (PINs 111111–555555, change before production)
- [x] Phase 4: Edge Functions `import-guardians` + `reset-pin`; Admin استيراد tab with CSV upload + PIN reset UI
- [x] Real school logo icons (icon-192/512, apple-touch-icon) — merged PR #4
- [x] Cleanup: Cloudflare D1 `rumaila-homework-db` + R2 `rumaila-homework-uploads` deleted
- [?] `bootstrap.sh` run by owner — UNVERIFIED: confirm Supabase project `rumaila-homework` ACTIVE_HEALTHY + migration applied, `send-push`/`import-guardians`/`reset-pin` deployed (`npm run fn:deploy`), Vercel project production READY
- [ ] Guardian UI: Today (by date, per child/section), date picker + archive, search, notices, mark_read, push opt-in
- [ ] Admin UI: homework CRUD per section/day (quick entry from timetable), attachments upload, notices, publish → call `send-push`

# WAJIBATI — Global Rename & Integration Audit

| Field | Value |
|---|---|
| Date | 2026-10-22 |
| Official names | AR `واجباتي` · EN `Wajibati` · slug `wajibati` · repo `sufyanaser/WAJIBATI` · local `G:\PROJECTS\WAJIBATI` |
| Branch | `chore/wajibati-rename` (from `origin/dev` @ `69828b3`) |
| Rename commit | `d41012270c7772479430b1b0ff678421dc20a065` |
| Pushed / merged / deployed | **No / No / No** |
| Recommendation | **GO** for repo-local merge to `dev` · **NO-GO** for Vercel rename until the manual steps in §8 are done |

---

## 1. Mandatory context

| File | Status |
|---|---|
| `AGENTS.md`, `AGENT_CONTEXT.md` | Read — used as source of truth |
| `00-PROJECT-OVERVIEW.md` … `06-DECISIONS-STATUS.md` | **NOT FOUND** — absent in the local tree and on all 27 remote branches. Must be created separately; not fabricated in this task. |

## 2. Repository verification

| Check | Result |
|---|---|
| Local `origin` (`G:\PROJECTS\WAJIBATI\.git\config`) | `https://github.com/sufyanaser/homeworks.git` — **obsolete** |
| Same project? | **VERIFIED** — `git ls-remote` of `homeworks.git` and `WAJIBATI.git` return identical refs (HEAD `a640ba5`, dev `69828b3`). GitHub rename redirect is active. |
| Local branch / HEAD | `dev` @ `66a9211` (pushed; contained in `origin/dev`) |
| Local working tree | Clean vs `66a9211` (all tracked source/config/docs compared, CRLF-normalised). No local changes at risk. |
| Local vs remote | Local `dev` is **4 commits behind** `origin/dev` (`92c8cdf`, `9630e6c`, `418dd48`, `69828b3`) |
| `origin/main` vs `origin/dev` | Diverged — `main` has #43–#45 (local phone format, archive-on-delete, A4 export v2) not yet in `dev` |
| Remote URL update | **Not applied** — this session has no shell on the Windows host. Command in §8.1. |

## 3. Previous names discovered

| Name | Where | Class |
|---|---|---|
| `rumaila-homework` | `package.json`, lockfile, `AGENTS.md` title, `bootstrap.sh` `REPO` default, Supabase project's former name, Cloudflare D1/R2 (deleted) | A / B / E |
| `homeworks` | GitHub repo (old), Vercel project name, `*.vercel.app` URLs, historical reports | B / E |
| `واجبات الرميلة` | push titles (2), SW fallback, test assertion, README/AGENT_CONTEXT titles, DB `settings.branding.app_name` (init migration) | A / F |
| `Rumaila Homework(s)` | test-suite header, init migration header comment | A / F |
| `*.rumaila.local` | guardian/admin synthetic auth email domain (src, Edge Function, migrations, e2e) | **F — preserved** |
| `إعدادية/اعدادية الرميلة للبنين` | headers, exports, manifest description, seeds | **D — preserved** |
| `Homework*` identifiers (`HomeworkCard`, `homework` table…) | code/DB | **C — preserved** |
| `homework-app`, `Homework App` | — | not present |
| Electron / desktop | — | **not present** (no Electron, installer, app ID or update provider) |

## 4. New names applied (commit `d410122`)

| File | Change | Class |
|---|---|---|
| `package.json`, `package-lock.json` | `name: rumaila-homework` → `wajibati` | A |
| `src/hooks/useAdminSection.ts` | push title → `واجباتي` | A |
| `src/pages/admin/HomeworkEntry.tsx` | push title → `واجباتي` | A |
| `src/sw.ts` | notification fallback title → `واجباتي` | A |
| `src/hooks/__tests__/useAdminSection.test.ts` | assertion follows new push title | A |
| `src/test/homework.test.ts` | header comment → `Wajibati (واجباتي)` | A |
| `index.html` | + `application-name`, `apple-mobile-web-app-title` = `واجباتي` | A |
| `README.md` | title → `واجباتي · Wajibati`, repo link → `sufyanaser/WAJIBATI` | A / E |
| `AGENTS.md` | title, repo note, manifest name line | A / E |
| `AGENT_CONTEXT.md` | name, repo URL, Supabase display name `WAJIBATI`, Vercel current/target name | A / E |
| `.omm/overall-architecture/description.md` | repaired encoding-corrupted Arabic (`?????? ???????`) → `واجباتي — إعدادية الرميلة للبنين` | A |
| `scripts/bootstrap.sh` | `REPO=WAJIBATI`; **pinned** `SUPABASE_REF=oconxdrujhjaunvrycdz`; new `VERCEL_PROJECT=homeworks` (prevents a rerun from creating a duplicate Supabase project or a new Vercel project) | B |

Already correct before this task (no change): browser title, PWA manifest `name`/`short_name`, login/admin headers, dashboard title, logo `alt`, PNG/A4 export headers + filename (`واجباتي-<date>.png`), CSS design-system banner.

## 5. Intentionally preserved

| Item | Reason |
|---|---|
| `@guardian.rumaila.local` / `@admin.rumaila.local` | Auth identity of every existing user. Renaming = mass login break; requires an approved migration + client release in lock-step. |
| `settings.branding.app_name = 'واجبات الرميلة'` (DB row from init migration) | Not read by the client (verified: no `branding`/`app_name` reads in `src`). Applied migrations are immutable. Optional data update in §8.4. |
| Init migration header comment | Applied migration — never edited. |
| Historical reports (`docs/FINAL-RELEASE-READINESS.md`, `docs/POST-MERGE-*`, `docs/release/*`, `docs/implementation/ARCHITECTURE-AUDIT.md`, `CODEX_TASK.md`) | Point-in-time evidence (PR #28 link, `homeworks-*.vercel.app` URLs, old worktree paths). GitHub redirects keep the PR link valid. |
| `homeworks-nasai.vercel.app` / `homeworks-pi.vercel.app` in `AGENT_CONTEXT.md` | Still the live URLs until the Vercel rename — documented, not rewritten. |
| `.github/workflows/*` | No repo-specific URLs; `actions/checkout@v4` uses the running repo. Nothing to change. |
| `vercel.json` | No project name / domains. Nothing to change. |
| `fn:deploy` script omits `import-school-master` | Unrelated pre-existing gap — reported, not fixed. |

## 6. Integration status

### GitHub
- Repo renamed `homeworks` → `WAJIBATI`; old URL redirects (verified by ref identity).
- Workflows: `ci.yml` (build on every push/PR, placeholder env fallback), `supabase.yml` (**manual `workflow_dispatch` only** — runs `supabase db push` + function deploy against `secrets.SUPABASE_PROJECT_REF`). Repo rename does not affect Actions secrets.
- GitHub API / repo settings: NOT VERIFIED (session has no GitHub API access to this repo).

### Vercel
| Item | Status |
|---|---|
| Project | `homeworks` · `prj_h5aJDlHIKGUcV5rg5gjOTLtA39DA` · team `nasai` (`team_SRgSLiL677tiEdZUFN9FbUbL`) — from repo docs |
| Live API inspection | **NOT VERIFIED** — Vercel MCP returned `403 forbidden` for scope `nasai` (team access not authorized for this connection) |
| `.vercel/project.json` | Not committed (correct) |
| Git integration after GitHub rename | Vercel tracks the repo by numeric repo ID, so the rename normally keeps working — **must be confirmed** in Settings → Git (should show `sufyanaser/WAJIBATI`) |
| Env vars | Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` (per docs). Supabase is provisioned through the **Vercel Marketplace integration** (`linked-project.json` org = `vercel_icfg_EKF0YIvMZtgJPitMvhlxCrHr`) — integration-managed env vars may also be present. |
| Domains | Only `*.vercel.app` documented; no custom domain found |

### Supabase
| Item | Status |
|---|---|
| Project ref | `oconxdrujhjaunvrycdz` — **unchanged**; display name already `WAJIBATI` (per local `supabase/.temp/linked-project.json`) |
| Schemas, RLS, migrations, buckets (`attachments`, `branding`), Edge Functions (`send-push`, `import-guardians`, `import-school-master`, `reset-pin`) | Unchanged |
| Auth redirects / Site URL | No `supabase/config.toml` in repo → remote-only. App uses email/password with no `redirectTo` / magic links → **no redirect dependency on Vercel/GitHub URLs** in code. Site URL value: NOT VERIFIED. |
| Edge Function CORS | `Access-Control-Allow-Origin: *` on all 4 → no domain allowlist to update |
| Webhooks / email templates | None in repo; NOT VERIFIED remotely |
| `db push` / migrations / auth settings | **Not executed** |

## 7. OIDC risk analysis

| Finding | Detail |
|---|---|
| OIDC usage in repo | **None** — no `VERCEL_OIDC_TOKEN`, no `oidc` references, no AWS/GCP federation, Edge Functions authenticate via Supabase JWT only. |
| Vercel ↔ Supabase Marketplace integration | Bound to the Vercel **project ID** + integration config ID, not the project name. Rename does not re-key it. |
| Residual risk | If any external trust policy (outside this repo) validates the Vercel OIDC `sub` claim (`owner:nasai:project:homeworks:environment:production`), renaming the project changes it to `…:project:wajibati:…` and that trust breaks. **Owner must confirm none exist** before renaming. None were found from the repo. |
| Preview URL change | Renaming changes generated URLs (`homeworks-git-dev-nasai.vercel.app` → `wajibati-git-dev-nasai.vercel.app`). The `homeworks-nasai.vercel.app` production alias should be re-added to keep installed PWAs and guardian bookmarks working (an installed PWA is bound to its origin; a new origin = new install + new push subscriptions). |

## 8. Manual configuration requirements (stop boundary)

### 8.1 Local repo — `G:\PROJECTS\WAJIBATI` (safe, run by owner)
```powershell
cd G:\PROJECTS\WAJIBATI
git remote set-url origin https://github.com/sufyanaser/WAJIBATI.git
git remote -v
git fetch origin
git fetch .\wajibati-rename.bundle chore/wajibati-rename:chore/wajibati-rename
git switch chore/wajibati-rename
git log --oneline -3          # expect d410122 + audit commit on top of 69828b3
npm ci; npm run lint; npm test; npm run build
# when approved:
git push -u origin chore/wajibati-rename   # then PR → dev
```

### 8.2 Vercel (owner, dashboard — do NOT do before 8.1 PR is merged)
1. Authorize the Vercel connector for team `nasai` (or check in dashboard) → confirm Settings → Git shows `sufyanaser/WAJIBATI`, production branch `main`.
2. Confirm no external OIDC trust policy references `project:homeworks` (§7).
3. Settings → General → Project Name: `homeworks` → `wajibati`. Project ID unchanged.
4. Domains: keep/re-add `homeworks-nasai.vercel.app` (and `homeworks-pi.vercel.app`) as aliases of production so installed PWAs keep their origin; add `wajibati-nasai.vercel.app`.
5. Then set `VERCEL_PROJECT` default in `scripts/bootstrap.sh` to `wajibati` (one-line follow-up commit).

### 8.3 Supabase (owner, dashboard — verification only)
- Auth → URL Configuration: if Site URL / Redirect URLs list `homeworks-*.vercel.app`, **add** the new `wajibati-*` URLs; do not remove old ones until the alias plan in 8.2.4 is settled.

### 8.4 Optional data update (separate approval)
```sql
-- New migration, NOT applied by this task
update public.settings
set value = jsonb_set(value, '{app_name}', '"واجباتي"')
where key = 'branding';
```

### 8.5 Auth domain `*.rumaila.local` — out of scope
Keep. Any change needs a dedicated migration updating `auth.users.email` + `auth.identities`, synchronized with `src/lib/supabase.ts`, `import-guardians`, `AdminShell`, `AdminLogin`, `e2e/global-setup.ts`.

## 9. Validation

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | Git diff review | **PASS** | 13 files, +32/−21; no logic change beyond string identity |
| 2 | ESLint | **SKIPPED** | ESLint not installed/configured in repo (`lint` = `tsc --noEmit`) |
| 3 | TypeScript (`npm run lint`) | **PASS** | exit 0 (baseline also 0) |
| 4 | Unit tests (vitest) | **PASS** | 61/61 (baseline 61/61) |
| 5 | Production build | **PASS** | `tsc -b && vite build`, SW injectManifest 26 precache entries |
| 6 | Playwright | **PASS (partial)** | `01-public-routes` + `02-layout-visual`, desktop, no global-setup: 33/35. 2 failures = `Tajawal font loaded` — Google Fonts blocked by sandbox egress (403), environmental. `03-admin-ui` **NOT VERIFIED** (requires `E2E_ADMIN_PASSWORD` against live Supabase). |
| 7 | PWA manifest | **PASS** | `dist/manifest.webmanifest` name/short_name `واجباتي`, RTL, icons resolve; `start_url`/`scope` unchanged → install identity preserved |
| 8 | Desktop build | **SKIPPED** | No desktop/Electron target exists (`Wajibati Admin` not applicable yet) |
| 9 | Repository reference audit | **PASS** | No live code/config references to `sufyanaser/homeworks`; remaining refs are historical docs (§5) |
| 10 | Secret exposure audit | **PASS** | No keys/JWTs in tracked files; `.env`/`.env.local` gitignored and never committed; `dist` contains no secrets (only supabase-js `sb_secret_` prefix check) |

## 10. Remaining obsolete references (accepted)

- `CODEX_TASK.md` — `rumaila-homework` (historical task spec)
- `docs/**` historical reports — `homeworks`, `homeworks-*.vercel.app`, `sufyanaser/homeworks/pull/28`, `واجبات الرميلة`
- `AGENTS.md` §8 status log — Cloudflare `rumaila-homework-*` (deleted resources), Supabase `rumaila-homework` (former name)
- `supabase/migrations/20261021000000_init.sql` — header + `branding.app_name` (F)
- `*.rumaila.local` — auth convention (F)

## 11. Recommendation

- **GO** — merge `chore/wajibati-rename` → `dev` via PR after owner review (all mandatory local checks pass).
- **NO-GO (pending)** — Vercel project rename until §8.2 steps 1–2 are confirmed; Supabase/production unchanged.

# واجباتي · Wajibati — إعدادية الرميلة للبنين

Repository: https://github.com/sufyanaser/WAJIBATI · Technical slug: `wajibati`

PWA لعرض الواجبات اليومية لأولياء الأمور + Dashboard للمشرف.

| Layer | Stack |
|---|---|
| Frontend | React + Vite PWA (Workbox, injectManifest) |
| Backend | Supabase (Postgres, Auth, Storage, RLS, Edge Functions) |
| Push | Web Push (VAPID) → `supabase/functions/send-push` |
| Hosting | Vercel (git-connected, auto deploy on `main`) |
| CI | GitHub Actions: build on every push, `db push` + functions deploy on `supabase/**` changes |

## Setup
```bash
npm i
SUPABASE_ACCESS_TOKEN=<token> ./scripts/bootstrap.sh   # GitHub + Supabase + Vercel, idempotent
npm run dev
```

## Layout
```
src/                 PWA (guardian + admin)
src/sw.ts            service worker (precache + push)
supabase/migrations  schema + RLS + storage
supabase/functions   edge functions
scripts/             bootstrap
```

## Branches
`main` → production · `dev` → Vercel preview

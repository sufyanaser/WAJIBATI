Now I have all the data needed to produce the complete audit. Here it is:

---

# DEPLOYMENT & PWA QA AUDIT — واجباتي (WAJIBATI)

**Audit Date:** 2026-10-21
**Auditor:** Agent 07 — Deployment & PWA Engineer
**Scope:** Static code analysis; no live environment access

---

## A — Vercel Configuration

**PASS**

`vercel.json` contains:
- SPA rewrite: `"source": "/((?!assets/|sw.js|manifest.webmanifest|.*\\.png).*)"` → `/index.html`. The negative lookahead correctly excludes build asset directories, the service worker, the manifest, and PNG icon files from being rewritten. This is more precise than a naive `/*` rewrite.
- `sw.js` Cache-Control header: `no-cache` is set explicitly. This ensures browsers always re-fetch the service worker, enabling prompt SW updates.

**Note:** The rewrite excludes `.png` files globally via `.*\\.png`, which is intentional for PWA icons. However, if PNG images are ever served from app routes (unlikely), they would bypass the SPA router. Non-issue in current architecture.

---

## B — Build Script

**PASS**

`package.json` scripts:
```
"build": "tsc -b && vite build"
```
TypeScript compilation (`tsc -b`) runs before Vite build. A type error will abort the build. CI inherits this because `ci.yml` runs `npm run build` directly.

---

## C — PWA Manifest

**PASS with minor note**

`vite.config.ts` VitePWA manifest:
| Field | Value | Expected |
|---|---|---|
| `name` | `واجباتي` | `واجباتي` ✓ |
| `short_name` | `واجباتي` | present ✓ |
| `theme_color` | `#1F3A5F` | `#1F3A5F` ✓ |
| `background_color` | `#0F1E33` | `#0F1E33` ✓ |
| `display` | `standalone` | ✓ |
| `lang` / `dir` | `ar` / `rtl` | ✓ |
| `start_url` | `/` | ✓ |

**Minor inconsistency:** `index.html` meta `theme-color` is `#08152A`, which differs from the manifest `theme_color` of `#1F3A5F`. The OS uses the manifest value for the app chrome, but browsers may use the meta tag during initial load. These should be aligned.

**Minor note:** The 512×512 icon entry uses `purpose: 'any maskable'` (a single string with two values, space-separated). This is spec-valid per W3C Web App Manifest, but for maximum compatibility, splitting into two separate icon entries — one with `purpose: 'any'` and one with `purpose: 'maskable'` — is recommended so that maskable-aware browsers (Android) pick the maskable variant without ambiguity.

---

## D — Icons

**PASS — Real school logo confirmed**

Files present in `public/`:
| File | Dimensions | File Size |
|---|---|---|
| `icon-192.png` | 192×192 px, RGBA PNG | ~43 KB |
| `icon-512.png` | 512×512 px, RGBA PNG | ~200 KB |
| `apple-touch-icon.png` | 180×180 px, RGBA PNG | ~38 KB |

All three files are genuine RGBA PNGs with substantial file sizes consistent with real artwork (not single-color placeholders). AGENTS.md status confirms "Real school logo icons — merged PR #4". `index.html` correctly references `/apple-touch-icon.png` via `<link rel="apple-touch-icon">`. The `manifest.webmanifest` references both `/icon-192.png` and `/icon-512.png`.

---

## E — Service Worker: Push, Click, Precache

**PASS**

`src/sw.ts` handles all three required event types:

- **Precache:** `precacheAndRoute(self.__WB_MANIFEST)` — Workbox injectManifest pattern; precaches all build outputs.
- **Cache cleanup:** `cleanupOutdatedCaches()` runs on SW install to remove stale precache entries.
- **Push event:** `self.addEventListener('push', ...)` — correctly extracts `title`/`body`/`url` from `e.data.json()`, shows notification with RTL `dir:'rtl'`, `lang:'ar'`, and `/icon-192.png`. Falls back to default title if data is absent.
- **notificationclick:** `self.addEventListener('notificationclick', ...)` — closes notification and opens `e.notification.data.url`. Correct.
- **Auth cache clearing:** `activate` deletes `supabase-rest` cache; `message` event listens for `CLEAR_AUTH_CACHES` to support logout cache purge from the app. This is appropriate for shared-device scenarios.

---

## F — Offline Handling

**PASS (app-level) / PARTIAL (no dedicated offline page)**

- The SW precaches the full app shell via Workbox `precacheAndRoute`, so the React app loads offline.
- `src/hooks/useHomework.ts` exposes an `offline: boolean` flag and has a code path to "try offline cache" when the network fetch fails.
- `src/pages/Today.tsx` renders `<p className="offline-note">⚠️ عرض مؤقت بدون اتصال</p>` when the offline flag is true.
- `src/styles.css` has an `.offline-note` style class.

**Gap:** There is no explicit Workbox offline fallback route (e.g., `NavigationRoute` with an offline.html). For navigations to un-precached routes while offline, the browser's default error page will appear. This is acceptable for a single-page app where `/` is always precached, but should be noted.

---

## G — Install Behavior (PWA Install Prompt)

**PARTIAL — Browser default only**

No `beforeinstallprompt` event handler was found in `src/App.tsx`, `src/main.tsx`, or any other source file. The app relies entirely on browser-native install prompts (the address-bar install button in Chrome/Edge and "Add to Home Screen" in Safari). There is no custom in-app install banner or install CTA.

**Recommendation:** For a guardian-facing school app where many users may be first-time PWA installers (especially on Android in Iraq), adding a simple install banner component would improve adoption. This is a UX gap, not a technical failure.

---

## H — SW Update Behavior

**PARTIAL — Auto-update, no user notification**

`vite.config.ts` sets `registerType: 'autoUpdate'`. Under this mode, `vite-plugin-pwa` inserts `skipWaiting()` and `clientsClaim()` calls automatically in the generated SW registration code. This means:
- A new SW activates as soon as it installs, without waiting for all tabs to close.
- The page may silently receive a new app version mid-session.

No `useRegisterSW` hook call was found in `App.tsx` or `main.tsx`, so there is no "new version available — reload?" toast for users. While `autoUpdate` is simpler, it can cause:
- Abrupt UI changes if a user is mid-task when an update activates.
- Potential data loss if in-flight Supabase calls are interrupted by a page reload.

**Recommendation:** Consider `registerType: 'prompt'` with a `useRegisterSW`-based reload banner, or at minimum a silent reload on next navigation.

---

## I — Push Subscription & VAPID Key

**PASS**

- `src/hooks/usePushSubscription.ts` implements the full opt-in/opt-out flow using `reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey })` where `vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY`.
- `src/components/PushOptIn.tsx` exposes a UI banner for opt-in with subscribe/unsubscribe buttons.
- `src/pages/Today.tsx` also contains an inline push subscription path keyed on `VITE_VAPID_PUBLIC_KEY`. (There appear to be two push subscription code paths — the hook and an inline one in Today.tsx — which should be consolidated to avoid divergence.)
- VAPID public key is sourced exclusively from `import.meta.env.VITE_VAPID_PUBLIC_KEY`, never hardcoded.
- The `send-push` Edge Function handles server-side fan-out with VAPID private key (server-only, never exposed to client bundle).

---

## J — Environment Variables

**PASS**

`.env.example` documents all required variables. Usage confirmed:

| Variable | Used In | Correct Prefix |
|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts` | VITE_ ✓ |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` | VITE_ ✓ |
| `VITE_VAPID_PUBLIC_KEY` | `src/hooks/usePushSubscription.ts`, `src/pages/Today.tsx` | VITE_ ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions / scripts only | no VITE_ ✓ |
| `VAPID_PRIVATE_KEY` | Edge Functions only | no VITE_ ✓ |
| `VAPID_SUBJECT` | `.env.example` shows `mailto:sufyanaser@gmail.com` | no VITE_ ✓ |

No server-only secrets are prefixed with `VITE_`. No hardcoded secrets found in source files.

---

## K — CI: Build & TypeScript

**PASS**

`ci.yml`:
- Triggers on every push and pull request (all branches).
- Runs `npm ci` (locked install) then `npm run build` (`tsc -b && vite build`).
- TypeScript strict mode errors will fail the build and block merges.
- Placeholder values supplied for `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` via `secrets || 'placeholder'` fallback, enabling build without production secrets.

**Note:** The `npm run lint` script (`tsc --noEmit`) is not run as a separate CI step — it is implicitly covered by `tsc -b` inside `npm run build`. This is acceptable but a separate lint step would give clearer failure messages.

**Note:** No automated test step (`npm test` / `vitest run`) is present in `ci.yml`. Tests exist (`src/test/` with vitest configured) but are not gated on CI. Consider adding `- run: npm test` to the CI job.

---

## L — Supabase CI

**PASS**

`supabase.yml`:
- Triggers on `push` to `main` branch when files under `supabase/**` change, plus `workflow_dispatch`.
- Links project via `SUPABASE_PROJECT_REF` secret.
- Runs `supabase db push` to apply new migrations.
- Deploys all three Edge Functions: `send-push`, `import-guardians`, `reset-pin`.
- All required secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`) are referenced.

**Note:** The `supabase/setup-cli@v1` step uses `version: latest`, which could pull a breaking Supabase CLI upgrade. Pinning to a specific CLI version (e.g., `version: 2.x`) would improve reproducibility.

---

## M — Production Domain

**BLOCKED — Cannot verify without live Vercel project access**

`vercel.json` contains no `domains` or `alias` configuration. Custom domain setup is done in the Vercel dashboard, not in `vercel.json`. From code analysis alone it is not possible to confirm whether a custom domain (e.g., `wajibati.iq` or `rumaila.edu.iq`) is configured or whether the app is served from a `*.vercel.app` subdomain.

**Action required:** Owner should confirm custom domain status in the Vercel dashboard and add a `domains` entry to `vercel.json` once confirmed.

---

## N — Caching Strategy

**PARTIAL**

- **Build assets (JS/CSS):** Vite appends content hashes to filenames (e.g., `assets/index-abc123.js`). These can be cached indefinitely by CDN and browser. Vercel's default CDN headers handle this.
- **PWA precache:** Workbox `precacheAndRoute` caches all build outputs in the SW cache at install time. Served offline.
- **API responses:** `src/hooks/useHomework.ts` has an offline cache fallback path, but no explicit Workbox runtime caching strategy (e.g., `NetworkFirst`, `StaleWhileRevalidate`) is configured for Supabase REST calls. The `supabase-rest` cache name is referenced only for deletion, not population — meaning the offline cache in `useHomework.ts` is likely an in-memory or React state cache rather than a persistent SW cache.
- **No explicit API caching in SW** — Supabase API responses are not persisted to the SW cache between sessions.

---

## O — Security Headers

**FAIL**

`vercel.json` only defines a single header (`Cache-Control: no-cache` for `/sw.js`). No security headers are present:

| Header | Status |
|---|---|
| `Content-Security-Policy` | Missing |
| `Strict-Transport-Security` | Missing |
| `X-Frame-Options` | Missing |
| `X-Content-Type-Options` | Missing |
| `Referrer-Policy` | Missing |
| `Permissions-Policy` | Missing |

**Recommendation:** Add a `headers` entry in `vercel.json` with a `source: "/(.*)"` pattern covering all routes. Minimum recommended set:
```json
{ "key": "X-Frame-Options", "value": "DENY" },
{ "key": "X-Content-Type-Options", "value": "nosniff" },
{ "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
{ "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
```
A CSP for this app is complex due to Google Fonts, Supabase CDN, and the inline React bundle, but at minimum `frame-ancestors 'none'` should be added.

---

## P — Vite 5 Compatibility

**PASS**

Dependency versions in `package.json`:
| Package | Version |
|---|---|
| `vite` | `^5.4.0` |
| `@vitejs/plugin-react` | `^4.3.1` |
| `vite-plugin-pwa` | `^0.20.1` |
| `vitest` | `^2.1.9` |
| `typescript` | `^5.5.4` |

- `vite-plugin-pwa` `0.20.x` fully supports Vite 5.x.
- `@vitejs/plugin-react` `4.x` is the correct companion for Vite 5.
- `vitest` `2.x` is compatible with Vite 5.
- No known breaking compatibility issues with this combination.
- The `test` config block inside `vite.config.ts` (rather than a separate `vitest.config.ts`) is a valid and supported pattern.
- Workbox packages are brought in transitively by `vite-plugin-pwa`; no direct Workbox version pinning is needed.

---

## Summary Table

| # | Item | Status | Severity |
|---|---|---|---|
| A | Vercel SPA rewrite + sw.js no-cache | **PASS** | — |
| B | Build script `tsc -b && vite build` | **PASS** | — |
| C | PWA manifest values + theme-color mismatch | **PASS / Note** | Low |
| D | Icons exist, real school logo | **PASS** | — |
| E | SW push / notificationclick / precache | **PASS** | — |
| F | Offline app shell + offline indicator | **PASS / Partial** | Low |
| G | No custom install prompt | **PARTIAL** | Low |
| H | autoUpdate with no reload notification | **PARTIAL** | Medium |
| I | Push opt-in UI + VAPID key from env | **PASS / Note** | Low |
| J | All env vars correctly prefixed | **PASS** | — |
| K | CI runs build + tsc; no test step | **PASS / Note** | Low |
| L | Supabase CI deploys migrations + functions | **PASS** | — |
| M | Custom domain — cannot verify from code | **BLOCKED** | — |
| N | Static asset caching OK; no SW API cache | **PARTIAL** | Medium |
| O | No security headers in vercel.json | **FAIL** | High |
| P | Vite 5 + plugin compatibility | **PASS** | — |

---

## Top Recommendations (Priority Order)

1. **[HIGH] Add security headers** to `vercel.json` — `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy` at minimum.
2. **[MEDIUM] Improve SW update UX** — Either use `registerType: 'prompt'` with a reload banner, or add a `useRegisterSW` hook to notify guardians when an update is available.
3. **[MEDIUM] Confirm/configure custom domain** in Vercel dashboard and document in `vercel.json`.
4. **[LOW] Align `theme-color`** in `index.html` (`#08152A`) with manifest `theme_color` (`#1F3A5F`).
5. **[LOW] Add `npm test` step to `ci.yml`** so the existing vitest suite gates pull requests.
6. **[LOW] Consolidate duplicate push subscription code** — `src/hooks/usePushSubscription.ts` and the inline subscription in `src/pages/Today.tsx` should use one path.
7. **[LOW] Pin Supabase CLI version** in `supabase.yml` instead of `version: latest`.
8. **[LOW] Split maskable icon** in manifest into two separate entries (`purpose: 'any'` and `purpose: 'maskable'`).

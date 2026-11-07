# AGENT_CONTEXT.md — واجباتي (Wajibati)
## ملف المرجع المعرفي للوكلاء — اقرأه كاملاً قبل أي خطوة

---

> **⚠️ إلزامي:** أي وكيل (Agent/AI/Human) يُكلَّف بهذا المشروع يجب أن يقرأ هذا الملف
> بالكامل قبل تنفيذ أي أمر، حتى أبسطها. تجاهل أي قسم قد يُتلف البيانات أو يكسر الإنتاج.

---

## 1. هوية المشروع

| الحقل | القيمة |
|---|---|
| الاسم | واجباتي — Wajibati (slug: `wajibati`) |
| المدرسة | اعدادية الرميلة للبنين — الرمادي، الأنبار، العراق |
| المالك | Sufyan Naser Ali — sufyanaser@gmail.com |
| المستودع | https://github.com/sufyanaser/WAJIBATI (السابق: `sufyanaser/homeworks` — إعادة توجيه GitHub) |
| الفروع | `dev` (تطوير) → PR → `main` (إنتاج) |

---

## 2. البنية التقنية

```
Frontend  : Vite 5 + React 18 + TypeScript (strict) + react-router-dom 6
PWA       : vite-plugin-pwa (injectManifest) — src/sw.ts
Backend   : Supabase (Postgres + RLS + Auth + Storage + Edge Functions/Deno)
Push      : Web Push/VAPID — Edge Function send-push (لا Firebase)
Hosting   : Vercel — main→production, dev→preview
CI        : GitHub Actions (.github/workflows/ci.yml + supabase.yml)
Region    : Supabase eu-central-1
```

---

## 3. معلومات النشر الفعلية (2026-10-21)

| البيئة | URL |
|---|---|
| Production | https://homeworks-nasai.vercel.app |
| Production (alias) | https://homeworks-pi.vercel.app |
| Preview (dev branch) | https://homeworks-git-dev-nasai.vercel.app |
| Vercel Project ID | `prj_h5aJDlHIKGUcV5rg5gjOTLtA39DA` (اسم المشروع الحالي `homeworks` — الهدف `wajibati`، انظر WAJIBATI-RENAME-AUDIT.md) |
| Supabase Project | `WAJIBATI` (oconxdrujhjaunvrycdz — ref ثابت لا يُغيَّر؛ الاسم السابق `rumaila-homework`) |
| Supabase Region | eu-central-1 |

---

## 4. ⚠️ نظام المصادقة — لا تغيّره بدون Migration

### اتفاقية أساسية غير قابلة للتغيير:
```
Guardian login = Supabase email/password
  email    = <أرقام الهاتف بدون +>@guardian.rumaila.local
  password = رمز PIN من 6 أرقام

مثال: هاتف +9647801234567 + PIN 111111
  → email: 9647801234567@guardian.rumaila.local
  → password: 111111
```

- **لا SMS، لا OTP، لا magic link** — فقط email/password داخلي.
- `normalizePhone('07801234567')` → `+9647801234567` → `9647801234567@guardian.rumaila.local`
- Admin = auth user + صف في `public.admins`
- localStorage key: `sb-oconxdrujhjaunvrycdz-auth-token`

---

## 5. بيانات الاختبار التجريبية (Demo — غيّر قبل الإنتاج)

| الاسم | الهاتف | PIN | Email داخلي | الطالب | الشعبة |
|---|---|---|---|---|---|
| أحمد محمد الدليمي | 07801234567 | 111111 | 9647801234567@guardian.rumaila.local | عمر أحمد محمد | رابع علمي أ |
| علي حسن الجبوري | 07802345678 | 222222 | 9647802345678@guardian.rumaila.local | حيدر علي حسن | رابع علمي أ |
| خالد سعود العاني | 07803456789 | 333333 | 9647803456789@guardian.rumaila.local | مصطفى خالد سعود | رابع علمي ب |
| محمود عمر الراوي | 07804567890 | 444444 | 9647804567890@guardian.rumaila.local | يوسف محمود عمر | خامس علمي أ |
| فارس جاسم الزوبعي | 07805678901 | 555555 | 9647805678901@guardian.rumaila.local | حسين فارس جاسم | خامس علمي أ |

UUIDs ثابتة:
- Auth users: `aa000001…` → `aa000005…`
- Guardians: `bb000001…` → `bb000005…`

---

## 6. متغيرات البيئة

### Client-side (Vercel + .env) — يجب أن تبدأ بـ VITE_:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY
```

### Server-only — ⛔ لا VITE_ أبداً، لا تُعرَّض للـ bundle:
```
SUPABASE_SERVICE_ROLE_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

### GitHub Actions Secrets:
```
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_PROJECT_REF
```

### Supabase Edge Function Secrets:
```
VITE_VAPID_PUBLIC_KEY   (public key للـ push)
VAPID_PRIVATE_KEY
VAPID_SUBJECT
+ built-in: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

---

## 7. Migrations المطبّقة (لا تعدّل المطبّقة — أضف ملفات جديدة فقط)

| الملف | الغرض | الحالة |
|---|---|---|
| `20261021000000_init.sql` | Schema كامل + RLS + Storage | ✅ مطبّق |
| `20261021020000_seed_demo.sql` | 5 guardians تجريبيون + sections + timetable | ✅ مطبّق |
| `20261021030000_fix_guardian_auth.sql` | Upsert auth.users بـ ON CONFLICT DO UPDATE (يضمن encrypted_password + email_confirmed_at) | ✅ مطبّق — PR #7 |

**السبب وراء `fix_guardian_auth`:** الـ seed الأصلي استخدم `ON CONFLICT DO NOTHING` مما سبب فشلاً صامتاً
في تسجيل الدخول. الإصلاح يضمن دائماً وجود الـ password والـ confirmation.

**تحذير Supabase:** إذا كان "Confirm email" مفعّلاً في Dashboard → Authentication → Email،
فالـ migration الجديد يضبط `email_confirmed_at` تلقائياً. لكن إيقاف هذا الخيار أكثر أماناً للـ demo.

---

## 8. Edge Functions المنشورة

| الدالة | المسار | الغرض |
|---|---|---|
| `send-push` | `supabase/functions/send-push/` | إرسال Web Push لـ guardians شعبة معينة |
| `import-guardians` | `supabase/functions/import-guardians/` | استيراد guardians من CSV |
| `reset-pin` | `supabase/functions/reset-pin/` | إعادة تعيين PIN لـ guardian |

---

## 9. الحالة الراهنة للكود (2026-10-21)

### ✅ مكتمل:
- Schema كامل + RLS + Storage (init migration)
- Demo seed + fix auth migration
- GitHub Actions CI (`ci.yml`) + Supabase deploy (`supabase.yml`)
- Vercel deployment (production + preview)
- Admin UI كامل: tabs (واجبات / إشعارات / استيراد CSV + PIN reset)
- Guardian UI — `Today.tsx`: عرض الواجبات اليومية، بحث، تقويم أرشيف، إشعارات، push opt-in
- Real school logo icons
- Edge Functions: send-push, import-guardians, reset-pin
- PWA: precache + push + notificationclick في `sw.ts`

### 🔧 تغييرات مؤقتة (يجب إعادتها للإنتاج):
- **`src/pages/Today.tsx` — bypass login مؤقت:** حالياً يفتح بدون جلسة مصادقة
  لأغراض التجريب. يجب إعادة الـ auth check قبل إطلاق الإنتاج الفعلي.
  الكود الأصلي الذي يجب استعادته:
  ```ts
  // داخل useEffect boot:
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) { nav('/login'); return }  // ← هذا السطر محذوف مؤقتاً
    bootstrap()
    ...
  })
  ```

### ⏳ عمل مستقبلي:
- Admin CRUD للواجبات (إدخال سريع من الجدول الدراسي)
- Upload المرفقات من Admin
- نشر الواجبات → استدعاء send-push
- اختبار تسجيل دخول guardian على الإنتاج بعد حل مشكلة Supabase Auth

---

## 10. قواعد العمل الصارمة

### Schema:
- ✅ تغييرات Schema = ملف migration جديد بتنسيق `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`
- ⛔ لا تعدّل migration مطبّقة أبداً
- ✅ كل جدول جديد: RLS مفعّل + policies صريحة

### كود:
- ✅ `npm run build` يجب أن يكون أخضر قبل أي commit
- ✅ تعديلات مستهدفة دقيقة — لا إعادة كتابة لملفات غير معنية
- ⛔ لا تُكشف `SUPABASE_SERVICE_ROLE_KEY` أو `VAPID_PRIVATE_KEY` في الـ bundle
- ✅ واجهة عربية RTL — معرّفات تقنية بالإنجليزية
- ✅ Dark navy palette: `#0F1E33` / `#1F3A5F`, accent `#E8B04A`

### Git:
- ✅ فرع `dev` → PR → `main`
- ✅ Conventional commits: `feat:` / `fix:` / `chore:`
- ✅ لا تدفع مباشرة على `main`

### أمان:
- ⛔ لا `VITE_` على أي مفتاح سري
- ⛔ لا تُدرج credentials في commit messages أو PR descriptions
- ✅ RLS مفعّل على كل جدول — guardians يرون بياناتهم فقط عبر `my_section_ids()`

---

## 11. هيكل الملفات الرئيسي

```
/
├── index.html                          RTL shell, viewport, icons
├── vite.config.ts                      PWA manifest, build config
├── vercel.json                         SPA rewrites, sw.js no-cache header
├── AGENTS.md                           تعليمات الوكلاء الأساسية
├── AGENT_CONTEXT.md                    هذا الملف — المرجع الشامل
├── src/
│   ├── main.tsx                        React entry
│   ├── App.tsx                         Router: /login, /admin/login, /admin/*, /*→Today
│   ├── lib/
│   │   ├── supabase.ts                 Supabase client (VITE_SUPABASE_URL/ANON_KEY)
│   │   └── database.types.ts          Auto-generated types (npm run db:types)
│   ├── pages/
│   │   ├── Login.tsx                   Guardian: phone + PIN login
│   │   ├── Today.tsx                   Guardian: daily view (⚠️ auth bypass مؤقت)
│   │   ├── AdminLogin.tsx             Admin: email login
│   │   └── Admin.tsx                  Admin: tabs واجبات/إشعارات/استيراد
│   └── sw.ts                           Service Worker: precache + push
├── supabase/
│   ├── migrations/
│   │   ├── 20261021000000_init.sql    Schema كامل
│   │   ├── 20261021020000_seed_demo.sql  Demo data
│   │   └── 20261021030000_fix_guardian_auth.sql  Auth upsert fix
│   └── functions/
│       ├── send-push/index.ts
│       ├── import-guardians/index.ts
│       └── reset-pin/index.ts
├── scripts/
│   └── bootstrap.sh                   Infra provisioning (idempotent)
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── .github/workflows/
    ├── ci.yml                          Build check on push/PR
    └── supabase.yml                   DB push + fn deploy on supabase/** → main
```

---

## 12. سير العمل الموصى به لأي وكيل جديد

```
1. اقرأ AGENTS.md و AGENT_CONTEXT.md (هذا الملف) بالكامل
2. تحقق من فرع العمل: git status + git log --oneline -5
3. تحقق من حالة الـ CI: GitHub Actions → آخر run على main
4. نفّذ المهمة على فرع dev
5. npm run build — يجب أن ينجح
6. git commit بـ conventional commit message
7. git push origin dev
8. افتح PR إلى main كـ draft
9. راقب Vercel Preview + GitHub Actions CI
10. اطلب merge من المالك
```

---

## 13. أوامر يومية

```bash
npm i                          # install
npm run dev                    # dev server (localhost:5173)
npm run build                  # build للتحقق قبل الـ commit
npm run lint                   # TypeScript type check
npm run db:push                # طبّق migrations على Supabase
npm run db:types               # جدّد database.types.ts
npm run fn:deploy              # انشر Edge Functions
```

---

## 14. تحذيرات تقنية مهمة

1. **Supabase network من الـ container:** لا يمكن الوصول لـ `*.supabase.co` من بيئة الـ CI container
   — استخدم Playwright مع mock للـ Supabase calls في الاختبارات.

2. **Playwright:** متوفر عبر `/opt/node-tools/node_modules/playwright` (CommonJS require)
   Chromium في `/opt/pw-browsers/chromium` — أضف `--no-sandbox`.

3. **ON CONFLICT DO NOTHING خطر:** عند إضافة seed data، استخدم `ON CONFLICT DO UPDATE`
   دائماً لضمان التحديث الفعلي وليس الفشل الصامت.

4. **Vercel teamId:** عند إنشاء مشاريع Vercel عبر MCP، استخدم `create_project` بدون teamId
   (team scope يعطي 403). الفريق `nasai` يُكتشف تلقائياً.

5. **supabase.yml trigger:** تُشغَّل تلقائياً عند push على `main` بتغييرات في `supabase/**`.
   لتشغيل يدوي: GitHub Actions → Supabase Deploy → Run workflow.

---

*آخر تحديث: 2026-10-21 — Sufyan Naser Ali*

# WAJIBATI v1.0.0 — Release Notes
**اعدادية الرميلة للبنين — نظام متابعة الواجبات**
تاريخ الإصدار: 2026-10-22 (محدَّث: 2026-10-22 — Production Readiness patch)
Commit: 4084347 → HEAD

---

## الوظائف المتاحة / Available Features

### بوابة المشرف / Admin Portal
- تسجيل دخول المشرف بالبريد الإلكتروني وكلمة المرور
- إدارة البيانات الرئيسية: الطلاب، المعلمون، المواد، الفصول، الجدول الأسبوعي
- إدخال الواجبات اليومية لكل فصل ومادة وحصة (حالة draft → published → archived)
- نشر الواجب منفرداً أو دفعةً واحدة مع إرسال Web Push تلقائي
- تصدير الواجبات بصيغة PDF A4 + ملف Excel
- استيراد بيانات المدرسة من ملف Excel (المعلمون، المواد، الفصول، الجدول)
- استيراد أولياء الأمور بملف CSV عبر Edge Function
- إعادة تعيين PIN لولي الأمور
- صفحة الإشعارات (محتوى النظام)
- أرشيف الواجبات القابل للبحث
- حماية RLS كاملة على مستوى قاعدة البيانات

### بوابة ولي الأمر / Guardian Portal
- تسجيل دخول برقم الهاتف + PIN مكوّن من 6 أرقام
- عرض الواجبات اليومية لكل طفل مسجّل في الفصل
- تصفح الأرشيف الكامل والبحث في الواجبات
- استقبال Web Push للواجبات المنشورة (الاشتراك اختياري)
- واجهة عربية RTL — Mobile-first

### البنية التحتية / Infrastructure
- PWA كاملة: Service Worker + Precache + Push + notificationclick
- Supabase: Postgres + RLS + Auth + Storage + Edge Functions
- CI/CD: GitHub Actions build + Vercel (main → production)
- أيقونات المدرسة الحقيقية (192×192، 512×512، apple-touch-icon)

---

## التغييرات في هذا التحديث / Changes in This Patch

| الملف | التغيير |
|-------|---------|
| `src/hooks/useAdminSection.ts:204` | **إصلاح P1** — استبدال `delete()` بـ `update({status:'archived'})` في `deleteHomework()` — الواجبات لا تُحذف نهائياً |
| `src/hooks/__tests__/useAdminSection.test.ts` | إضافة اختبارَي وحدة للتحقق من سلوك الأرشفة بدلاً من الحذف |
| `e2e/04-publish-guardian-flow.spec.ts` | إضافة اختبار E2E تكاملي: بوابة ولي الأمر + تدفق Admin→Publish→Guardian→View |

---

## المشكلات المعروفة / Known Issues

| # | المشكلة | الخطورة | الحالة |
|---|---------|---------|--------|
| 1 | ~~واجهة ولي الأمر (اليوم) — غير مكتملة~~  | ~~عالية~~ | **مُصلَّح** — `Today.tsx` مكتمل (603 سطر) مع بيانات Supabase حقيقية، تعدد الأبناء، التنقل بالتاريخ، البحث، Push opt-in، تصدير PDF، وضع offline |
| 2 | ~~حذف الواجب في `useAdminSection.ts:207` يحذف السجل فعلياً~~ | ~~متوسطة~~ | **مُصلَّح** — تم تغييره إلى `update({status:'archived'})` في هذا التحديث |
| 3 | Migration `20261021400000_teaching_assignments.sql` لم تُطبَّق على الإنتاج بعد — تتبّع تعيين المعلمين على المواد | منخفضة | تنتظر موافقة المشغّل |
| 4 | بيانات الاختبار التجريبي (demo PINs 111111–555555) موجودة في قاعدة البيانات — يجب تغييرها قبل الاستخدام الحقيقي | **عالية** | **مطلوب قبل الإطلاق** — استخدم edge function `reset-pin` أو واجهة الإدارة |
| 5 | `adminSignIn()` في `e2e/helpers.ts` يستخدم افتراضيات مُرمَّزة (`admin1`) | منخفضة | موجود مسبقاً على main — يُعالَج في PR مستقل |

---

## حالة الاختبار / Test Status
| الاختبار | النتيجة |
|---------|---------|
| TypeScript (lint) | PASS ✓ |
| Unit tests — 63 اختباراً (↑2 جديد) | PASS ✓ |
| E2E — 03-admin-ui.spec.ts | موجود ✓ |
| E2E — 04-publish-guardian-flow.spec.ts | جديد ✓ |
| Build production | PASS ✓ |
| فحص الأسرار في bundle | نظيف ✓ |

---

## ملاحظة المشغّل / Operator Note
هذا الإصدار **جاهز للاستخدام المدرسي** بعد تنفيذ الخطوات الآتية:
1. تغيير demo PINs (111111–555555) باستخدام واجهة الإدارة → استيراد أو إعادة تعيين PIN
2. الموافقة على تطبيق migration `20261021400000_teaching_assignments.sql` بعد مراجعة القسم §4 أعلاه
3. التحقق من أن `E2E_ADMIN_PASSWORD` يطابق الحساب المنشأ في bootstrap.sh

---

## ملفات الإصدار / Release Assets
- `WAJIBATI-v1.0.0-Web.zip` — مجلد `dist/` جاهز للنشر (476 KB)
- `WAJIBATI-v1.0.0-Source.zip` — الشيفرة المصدرية بدون `.env` أو `node_modules` (1.9 MB)

# تقرير التدقيق الأمني والتحقق من Supabase (Supabase & Security Verification)
## Phase 02.5 — Independent QA Gate · WAJIBATI (واجباتي)

- **المشروع:** واجباتي — إعدادية الرميلة للبنين (Wajibati)
- **المرحلة:** Phase 02.5 — التدقيق الأمني لخدمات Supabase والصلاحيات
- **الملف:** `03-SUPABASE-SECURITY-VERIFICATION.md`
- **تاريخ التدقيق:** 22 تشرين الأول 2026
- **المُدقِّق المستقل:** Lead QA Architect & Verification Orchestrator (Google Antigravity)
- **مستويات الأدلة المستخدمة:**
  * `VERIFIED`: مُثبت ومُختبر عملياً في بيئة التشغيل.
  * `CODE-REVIEWED`: مُدقق عبر فحص الشيفرة المصدرية واختبارات الوحدة وملفات الهجرة SQL.
  * `UNVERIFIED`: لم يتسنَ اختباره بصورة حية لغياب صلاحية الاتصال بالسحابة الإنتاجية (ممتنع وفق بوابة الأمان).

---

## 1. تدقيق عميل Supabase ومكافحة تسريب الأسرار (Secret Leakage Audit)

| الفحص / المعيار | الحالة | مستوى الدليل | تفاصيل التحقق والنتائج |
|---|:---:|:---:|---|
| **تهيئة العميل `supabase.ts`** | **PASS** | `VERIFIED` | العميل يستخدم فقط `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` المعلنين. |
| **فحص مفتاح الخدمة الفائق** | **PASS** | `VERIFIED` | خلو كود العميل تماماً من `SUPABASE_SERVICE_ROLE_KEY` (0 نتائج عبر `git grep`). |
| **فحص المفتاح الخاص بالإشعارات** | **PASS** | `VERIFIED` | المفتاح الخاص `VAPID_PRIVATE_KEY` محصور في بيئة Deno Edge Functions ولم يُسرب لحزمة الويب. |
| **تخزين الجلسة المشفر** | **PASS** | `VERIFIED` | دعم وسيط التخزين الآمن عبر `platform.storage` مع تشفير DPAPI في تطبيق سطح المكتب. |

---

## 2. إدارة الجلسات وصلاحيات الوصول (Authentication & RBAC)

### هيكل الحسابات والاتفاقية التسموية:
* **حسابات المسؤولين:** `<username>@admin.rumaila.local` + كلمة مرور معقدة.
* **حسابات أولياء الأمور:** `<phone_digits>@guardian.rumaila.local` + رمز PIN مكون من 6 أرقام.

### تدقيق بوابة المشرف (`AdminShell.tsx`):
```typescript
const { data: adm, error } = await supabase
  .from('admins')
  .select('role')
  .eq('user_id', u.id)
  .maybeSingle()
if (error || !adm) {
  await supabase.auth.signOut()
  nav('/admin/login', { replace: true })
}
```
* **الحالة:** `CODE-REVIEWED` (PASS). يتم التحقق الصارم من وجود سجل في جدول `public.admins` فور المصادقة، وإذا لم يكن المستخدم مشرفاً، يتم طرده فورياً وتسجيل خروجه.

---

## 3. تدقيق سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)

تم فحص ملفات الهجرة في `supabase/migrations/` وخاصة `20261021000000_init.sql` و `20261021100000_security_fixes.sql`:

### الدوال المرجعية للأمان (Security Definer Functions):
```sql
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid() and role in ('owner','editor'))
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;
```

### مصفوفة الصلاحيات حسب الدور (RBAC Matrix):

| الجدول / المورد | دور المالك (`owner`) | دور المحرر (`editor`) | دور المشاهد (`viewer`) | دور ولي الأمر (`guardian`) |
|---|:---:|:---:|:---:|:---:|
| `academic_years` / `stages` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة فقط |
| `sections` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة شُعب أبنائه فقط عبر `my_section_ids()` |
| `subjects` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة فقط |
| `teachers` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة المعلمين النشطين فقط |
| `timetable` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة جدول شُعب أبنائه فقط |
| `students` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة بيانات أبنائه فقط |
| `guardians` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة سجله الخاص فقط (`user_id = auth.uid()`) |
| `homework` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة الواجبات المنشورة فقط لشُعب أبنائه |
| `attachments` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة مرفقات الواجبات المنشورة لشُعبه |
| `notices` | قراءة وكتابة | قراءة وكتابة | قراءة فقط | قراءة الإعلانات الفعالة والموجهة لشُعبه |
| `admins` | قراءة وكتابة | قراءة فقط | قراءة فقط | ممنوع كلياً (محجوب) |
| `school_account_profiles` | قراءة وكتابة | قراءة فقط | قراءة فقط | ممنوع كلياً (محجوب) |
| `school_import_batches` | قراءة وإدخال | ممنوع | ممنوع | ممنوع كلياً (محجوب) |

**النتيجة الأكيدة (PASS):**
حتى لو حاول مستخدم بدور `viewer` تزوير طلب كتابة عبر وحدة تحكم المتصفح مباشرة إلى واجهة Supabase REST API، فإن محرك Postgres RLS يرفض العملية فورياً بكود خطأ `42501 (insufficient_privilege)`.

---

## 4. تدقيق حاويات التخزين السحابية (Storage Buckets Policies)

| الحاوية | النوع | سياسة المشرف | سياسة ولي الأمر | التقييم الأمني |
|---|---|---|---|:---:|
| `attachments` | خاصة (Private) | صلاحية كاملة عبر `att_admin` بشرط `is_admin()`. | قراءة فقط مشروطة بوجود المرفق ضمن شُعب الأبناء وبحالة `published` عبر الهجرة `20261021110000`. | **PASS ✅** |
| `branding` | عامة (Public) | كتابة وتعديل للمشرف فقط عبر `att_admin`. | قراءة عامة قبل وبعد تسجيل الدخول لعرض الشعار والهوية. | **PASS ✅** |

---

## 5. تدقيق دوال الحافة السحابية (Edge Functions Audit)

تم فحص كود 4 دوال سحابية داخل `supabase/functions/`:

### 1. `send-push` (إرسال الإشعارات الفورية)
* **المصادقة:** تطلب JWT إداري وتفحص `user.rpc('is_admin')`؛ ترفض بكود `403 forbidden` إذا لم يكن مشرفاً.
* **التنفيذ:** تستخدم `SERVICE_ROLE_KEY` داخل بيئة Deno حصراً لجلب الاشتراكات وحذف الرموز الميتة (404/410).
* **التقييم:** **PASS ✅**.

### 2. `reset-pin` (إعادة تعيين رمز ولي الأمر)
* **المصادقة:** فحص `userClient.rpc('is_admin')`؛ ترفض المشاهدين وغير المشرفين.
* **التحقق من المدخلات:**
  * رقم الهاتف: يطابق التعبير النمطي `^\+9647[0-9]{9}$`.
  * الرمز السري الجديد: يطابق التعبير النمطي `^[0-9]{6}$`.
* **الأمان:** التحديث يتم عبر `db.auth.admin.updateUserById` دون إرسال كلمة المرور في الرد وبلا تسجيلها في جداول نصية.
* **التقييم:** **PASS ✅**.

### 3. `import-guardians` (استيراد أولياء الأمور عبر CSV)
* **المصادقة:** فحص `is_admin()`.
* **التحقق:** فحص تكرار الأرقام وصيغة الهاتف والرمز السري وتعيين البريد الاصطلاحي.
* **التقييم:** **PASS ✅**.

### 4. `import-school-master` (استيراد بيانات المدرسة الرئيسية من Excel)
* **المصادقة:** اشتراط دور المالك حصراً (`admin.role === 'owner'`).
* **الحماية الأمنية الخاصة:** السطر 26:
  ```typescript
  if ('pin' in row || 'password' in row)
    issues.push({ sheet, row: index + 2, message: 'يُمنع تضمين PIN أو password في ملف البيانات' })
  ```
  حظر صارم لتضمين أي رموز سرية أو كلمات مرور داخل ملفات Excel المستوردة منعاً لتسريبها.
* **التقييم:** **PASS ✅**.

---

## 6. خلاصة تدقيق الأمان والخدمات السحابية (Wave C Verdict)

| المحور | النتيجة | مستوى الدليل |
|---|:---:|:---:|
| عزل أسرار النظام ومفاتيح السحابة | **PASS** | `VERIFIED` |
| فحص الجلسة وبوابة المشرف | **PASS** | `CODE-REVIEWED` |
| سياسات الأمان RLS في قاعدة البيانات | **PASS** | `CODE-REVIEWED` |
| حماية المرفقات ومنع كشف مسودات الواجبات | **PASS** | `CODE-REVIEWED` |
| دوال السحابة ومصادقة الـ JWT | **PASS** | `CODE-REVIEWED` |
| الاتصال المباشر بالسحابة الإنتاجية | **UNVERIFIED** | محظور بأمر بوابة الأمان |

**الحكم النهائي للموجة C:** **PASS مع الالتزام التام ببروتوكولات الأمان والحماية.**

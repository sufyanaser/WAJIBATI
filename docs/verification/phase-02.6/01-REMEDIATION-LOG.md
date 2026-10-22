# سجل المعالجة الهندسية للعيوب (Targeted Remediation Log)
## Phase 02.6 — Defect Fixes & Component Integration · WAJIBATI (واجباتي)

- **المشروع:** واجباتي — إعدادية الرميلة للبنين (Wajibati)
- **المرحلة:** Phase 02.6 — المعالجة المركزة وإعادة التحقق المستقل
- **الملف:** `01-REMEDIATION-LOG.md`
- **تاريخ المعالجة:** 22 تشرين الأول 2026
- **الفرع:** `dev-admin-dashboard-reengineering` (Baseline HEAD: `9481042`)
- **المشرف الهندسي:** Targeted Remediation Lead & QA Orchestrator (Google Antigravity)

---

## 1. جدول المعالجة الشامل للعيوب الستة (Defect Remediation Summary)

| المعرف | الشدة | اسم العيب وموقعه | الملفات المعدلة | الحالة بعد المعالجة |
|---|:---:|---|---|:---:|
| **RT-01** | **P1** | غياب زر تصدير A4 في واجهة المشرف (`HomeworkEntry.tsx`) | `src/pages/admin/HomeworkEntry.tsx`<br>`src/styles.css` | **FIXED ✅** |
| **RT-02** | **P1** | حذف الإعلانات فورياً دون تأكيد (`NoticesPage.tsx`) | `src/pages/admin/NoticesPage.tsx` | **FIXED ✅** |
| **RT-03** | **P2** | عدم استهلاك المكونات المشتركة V2 في الصفحات الفرعية | `src/pages/admin/StudentsPage.tsx`<br>`src/pages/admin/TeachersPage.tsx`<br>`src/pages/admin/SectionsPage.tsx` | **FIXED ✅** |
| **RT-04** | **P2** | عدم اتساق بطاقات ومؤشرات لوحة المؤشرات (`DashboardHome.tsx`) | `src/pages/admin/DashboardHome.tsx` | **FIXED ✅** |
| **RT-05** | **P2** | مساحة لمس زر القائمة بالهاتف أقل من 44px (`styles.css`) | `src/styles.css` | **FIXED ✅** |
| **RT-06** | **P2** | غياب حجب أزرار التعديل والحذف عن المشاهد (`NoticesPage.tsx`) | `src/pages/admin/NoticesPage.tsx` | **FIXED ✅** |

---

## 2. التفاصيل الهندسية لمعالجة كل عيب (Deep-Dive Root Cause & Fix)

### RT-01 (P1): زر تصدير A4 للطباعة في شاشة الواجبات اليومية للإدارة
* **السبب الجذري (Root Cause):** شريط الإجراءات الثابت في `HomeworkEntry.tsx` كان يقتصر على زري "حفظ مسودة" و"نشر الكل". وعلى الرغم من اكتمال محرك التصدير A4 في `src/utils/exportHomework.ts`، لم يتم ربطه بواجهة المشرف كما نص عليه Wireframe V2.
* **الملفات المعدلة:**
  * `src/pages/admin/HomeworkEntry.tsx`:
    * استيراد `DownloadIcon` و `type { HomeworkExportData }`.
    * إضافة دالة `handleExportA4` التفاعلية التي تجمع بيانات الشعبة والتاريخ والحصص النشطة وتمررها لمحرك `exportAsPDF`.
    * إضافة زر "تصدير A4 للطباعة" مع `aria-label="تصدير A4 للطباعة"`.
  * `src/styles.css`:
    * إضافة فئة التنسيق `.he-btn-export` المتوافقة مع ألوان ونظام التصميم الكحلي/الذهبي.
    * تحديث `.he-action-bar` ليعتمد شبكة متجاوبة `grid-template-columns: repeat(auto-fit, minmax(130px, 1fr))` تمنع التداخل في كافة الشاشات.
* **إثبات التحقق:** اختبار وحدة آلي مخصص في `Phase026Remediation.test.tsx` يؤكد وجود الزر وتفعيله وعدم تعطله.

---

### RT-02 (P1): الحذف الآمن للإعلانات المدرسية عبر `ConfirmDialog`
* **السبب الجذري (Root Cause):** النقر على أيقونة سلة المهملات في `NoticesPage.tsx` كان ينفذ `deleteNotice(n.id)` مباشرة على قاعدة البيانات دون أي مربع حوار أو إشعار تأكيدي.
* **الملفات المعدلة:**
  * `src/pages/admin/NoticesPage.tsx`:
    * استيراد `ConfirmDialog` من `src/components/admin/ConfirmDialog`.
    * إضافة حالة `noticeToDelete: Notice | null` و `isDeleting: boolean`.
    * تعيين الإشعار المراد حذفه وعرض اسمه في رسالة التحذير: `هل أنت متأكد من حذف الإشعار "{title}"؟`.
    * جعل الإلغاء هو المسار الآمن الافتراضي الذي يغلق الحوار دون المساس بالبيانات.
    * حظر النقر المتكرر أثناء إرسال الطلب (`busy={isDeleting}`).
    * معالجة أخطاء Supabase وعرض رسائل النجاح أو الفشل عبر مكون `Toast`.
* **إثبات التحقق:** اختبار آلي يثبت أن مسار الإلغاء لا يستدعي دالة الحذف نهائياً، وأن التأكيد يحذف الإشعار بنجاح.

---

### RT-03 (P2): دمج المكونات المشتركة V2 في صفحات قاعدة البيانات
* **السبب الجذري (Root Cause):** تم بناء المكونات المشتركة (`PageHeader`، `StatusBadge`، `ConfirmDialog`) واختبارها في ملفاتها، لكن الصفحات الفرعية كانت تستخدم جداول ترويسة وشارات قديمة.
* **الملفات المعدلة:**
  * `src/pages/admin/StudentsPage.tsx`:
    * استيراد واستخدام `PageHeader` لعرض العنوان "دليل الطلاب وقوائم الفصول" مع شارة عدد الطلاب وزر الإضافة.
    * استبدال شارات CSS اليدوية بمكون `StatusBadge` الموحد (`variant="active"` أو `variant="suspended"`).
  * `src/pages/admin/TeachersPage.tsx`:
    * دمج `PageHeader` مع وسام عدد المعلمين النشطين.
    * استبدال الشارات بمكون `StatusBadge`.
  * `src/pages/admin/SectionsPage.tsx`:
    * دمج `PageHeader` مع وسام عدد الشُعب الفعّالة.
    * استبدال الشارات بمكون `StatusBadge`.
* **الأثر الإيجابي:** توحيد الهوية البصرية وإمكانية الوصول دون أي تعديل في المسارات أو بنية البيانات.

---

### RT-04 (P2): اتساق بطاقات ومؤشرات الصفحة الرئيسية (DashboardHome)
* **السبب الجذري (Root Cause):** بطاقات `navCards` كانت تحمل عناوين الهيكل القديم الثماني ومؤشراتها غير دقيقة (الجدول يربط بعدد الشُعب والإعدادات بعدد الأولياء).
* **الملفات المعدلة:**
  * `src/pages/admin/DashboardHome.tsx`:
    * تحديث البطاقات الست لتطابق الأقسام المعتمدة في V2:
      1. الواجبات اليومية (`/admin/homework`) — `واجب اليوم`
      2. الجدول الدراسي (`/admin/timetable`) — `شعبة دراسية`
      3. الإعلانات والتنبيهات (`/admin/notices`) — `إعلان فعال`
      4. قاعدة البيانات المدرسية (`/admin/master-data`) — `طالب مسجل`
      5. الهيئة التدريسية (`/admin/teachers`) — `مدرس نشط`
      6. الإعدادات والصلاحيات (`/admin/settings`) — `ولي أمر مرتبط`
* **إثبات التحقق:** اختبار آلي يتحقق من ظهور الأقسام الستة الموحدة وربطها بالمسارات الصحيحة.

---

### RT-05 (P2): توسيع مساحة لمس زر القائمة بالهاتف إلى 44×44px
* **السبب الجذري (Root Cause):** كان الزر `.admin-mobile-menu-btn` يمتلك حشوة `6px 10px` مع أيقونة 20px، مما أنتج ارتفاعاً فعلياً 32px، وهو ما يخالف معايير WCAG 2.1 و NAS UI/UX Guardian للشاشات اللمسية.
* **الملفات المعدلة:**
  * `src/styles.css`:
    * تحديث تنسيق الزر إلى:
      ```css
      .admin-mobile-menu-btn {
        display: none;
        background: transparent;
        border: 1px solid var(--border);
        color: var(--fg);
        padding: 10px 12px;
        min-width: 44px;
        min-height: 44px;
        border-radius: 8px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        transition: all 0.18s ease;
      }
      ```
* **الأثر:** تجربة لمسية مريحة تلبي معايير إمكانية الوصول الدولية دون أي تشوه في الشريط العلوي (Top Bar: 64px).

---

### RT-06 (P2): حجب أزرار التعديل والحذف عن دور المشاهد (Viewer Role Guard)
* **السبب الجذري (Root Cause):** صفحة `NoticesPage.tsx` كانت تعرض نموذج الإضافة وأزرار التعديل والحذف لجميع المستخدمين، معتمدة فقط على رفض Postgres RLS في السحابة.
* **الملفات المعدلة:**
  * `src/pages/admin/NoticesPage.tsx`:
    * استيراد وقراءة سياق `useAdmin()`.
    * احتساب الصلاحية: `canEdit = role === 'owner' || role === 'editor'`.
    * إخفاء نموذج الإضافة والتعديل عن المشاهد وعرض صندوق معلوماتي أنيق يوضح أن الحساب في "وضع المشاهدة (Viewer)".
    * إخفاء أزرار التعديل والحذف من قائمة الإعلانات للمشاهد.
* **إثبات التحقق:** اختبار آلي مخصص يتأكد من اختفاء النموذج والأزرار تماماً وظهور تنبيه وضع المشاهدة.

---

## 3. ملخص التغييرات في الشيفرة (Code Statistics)

```text
 src/pages/admin/DashboardHome.tsx |  25 +++--
 src/pages/admin/HomeworkEntry.tsx |  55 +++++++++-
 src/pages/admin/NoticesPage.tsx   | 224 ++++++++++++++++++++++++--------------
 src/pages/admin/SectionsPage.tsx  |  37 ++++---
 src/pages/admin/StudentsPage.tsx  |  35 +++---
 src/pages/admin/TeachersPage.tsx  |  35 +++---
 src/styles.css                    |  44 +++++++-
 src/pages/admin/__tests__/Phase026Remediation.test.tsx | 462 سطراً مضافاً
 8 files changed, 772 insertions(+), 145 deletions(-)
```

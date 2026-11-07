# مواصفات تكامل البيانات وخدمات Supabase (Data Integration Specification)
## AGENT-04 — Database & Supabase Integration Hub

- **المشروع:** واجباتي — إعدادية الرميلة للبنين (Wajibati)
- **المرحلة:** المرحلة الثانية (Phase 02) — تكامل البيانات وقواعد الوصول
- **الملف:** `04-DATA-INTEGRATION.md`
- **الحالة:** معتمد (Data Integration Approved)
- **المنسق:** Agent 04 (Database & Supabase)

---

## 1. مبدأ "مصدر الحقيقة الوحيد" (Single Source of Truth)

تلتزم بنية Phase 02 الصارمة بالاعتماد الكامل على **قاعدة بيانات Supabase** كمصدر وحيد للحقيقة (Single Source of Truth). لا توجد أي قواعد بيانات محلية موازية أو تخزين ثابت يحاكي البيانات الحقيقية:
* كافة عمليات القراءة تتم عبر عميل Supabase الرسمي الموثق (`src/lib/supabase.ts`).
* كافة عمليات التعديل والإضافة والحذف تخضع لسياسات الأمان على مستوى الصف (RLS).
* العمليات المتقدمة التي تتطلب صلاحيات الخادم الفائقة (مثل تعديل مصادقة رمز PIN أو استيراد البيانات الشاملة) تُنفذ عبر دوال Supabase Edge Functions الآمنة.

---

## 2. جدول العمليات وقنوات الربط مع جداول Supabase

| القسم في لوحة الإدارة | جداول Supabase المرتبطة | نوع العمليات المنفذة (CRUD) | آلية التنفيذ والأمان |
|---|---|---|---|
| **الرئيسية (Dashboard)** | `sections`, `students`, `teachers`, `guardians`, `homework`, `notices`, `teaching_assignments`, `timetable` | `SELECT (count, head: true)` | استعلامات متوازية خفيفة بدون استهلاك للشبكة |
| **الواجبات (Homework)** | `homework`, `attachments`, `timetable`, `sections`, `subjects`, `teachers` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | إدارة المسودات والنشر مع رفع المرفقات إلى Supabase Storage |
| **الجدول (Timetable)** | `timetable`, `teaching_assignments`, `sections`, `subjects`, `teachers` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | مطابقة الحصص وفحص التعارضات وتحديث خلايا الجدول |
| **الإعلانات (Notices)** | `notices`, `sections` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | فرز الإعلانات وبث التنبيهات مع فحص تاريخ الانتهاء |
| **سجل الطلبة (Students)** | `students`, `sections`, `guardian_students`, `guardians` | `SELECT`, `INSERT`, `UPDATE` | إضافة وتعديل الطلبة وربطهم بالشعب وأولياء الأمور |
| **سجل الكادر (Teachers)** | `teachers`, `subjects`, `teaching_assignments` | `SELECT`, `INSERT`, `UPDATE` | إدارة المدرسين والمواد المسندة |
| **أولياء الأمور (Guardians)**| `guardians`, `guardian_students`, `students` | `SELECT`, `INSERT`, `UPDATE` | تتبع أرقام الهواتف والأبناء المرتبطين |
| **الاستيراد الشامل (Import)** | كود مجمع لجميع جداول المدرسة | `POST (Edge Function)` | استدعاء دالة `import-school-master` السحابية |
| **إعادة ضبط PIN (PIN Reset)**| `auth.users`, `guardians` | `POST (Edge Function)` | استدعاء دالة `reset-pin` برقم الهاتف والرمز المشفر |

---

## 3. تكامل دوال الحافة السحابية (Edge Functions Integration)

### 3.1 دالة بث إشعارات الويب (`send-push`):
- **الهدف:** إرسال إشعارات الدفع (Web Push) عند نشر الواجبات أو الإعلانات.
- **الاستدعاء:**
  ```typescript
  await supabase.functions.invoke('send-push', {
    body: {
      section_id: secId,
      title: 'واجباتي',
      body: `واجب جديد — ${slot.subject} بتاريخ ${dateStr}`,
      url: '/',
    },
  })
  ```
- **الأمان:** التحقق من صلاحية المشرف وتطهير الاشتراكات الميتة (404/410).

### 3.2 دالة إعادة تعيين رمز PIN (`reset-pin`):
- **الهدف:** تمكين المشرف من تحديث رمز الدخول المكون من 6 أرقام لأولياء الأمور دون كشف كلمات المرور.
- **الاستدعاء:**
  ```typescript
  await supabase.functions.invoke('reset-pin', {
    body: { phone: '+9647XXXXXXXXX', new_pin: '123456' },
  })
  ```
- **الأمان:** تنفيذ التشفير الداخلي `bcrypt` عبر دور الخدمة (`service_role`) داخل الخادم المعزول.

### 3.3 دالة الاستيراد الذكي (`import-school-master`):
- **الهدف:** قراءة وتدقيق ملفات Excel الخاصة بالمدرسة ومعاينتها تمهيداً للتطبيق المعتمد.
- **المعلمات:** `action: 'preview' | 'apply'`, `payload: data`.

---

## 4. التحقق من سلامة البنية التحتية والمخطط (Schema Integrity)
* لم تتطلب أي من تعديلات Phase 02 أي تغيير في مخطط الجداول (Schema Migrations).
* الجداول الحالية والسياسات المعتمدة في `supabase/migrations/` كافية تماماً لتشغيل كافة الأقسام الستة.
* **النتيجة: تكامل بيانات متين بنسبة 100% دون أي فجوة أو تكرار.**

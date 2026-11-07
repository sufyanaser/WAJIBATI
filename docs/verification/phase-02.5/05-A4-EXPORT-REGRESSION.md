# تقرير التحقق من وظيفة تصدير الواجبات A4 وعدم التراجع (A4 Export Regression Audit)
## Phase 02.5 — Independent QA Gate · WAJIBATI (واجباتي)

- **المشروع:** واجباتي — إعدادية الرميلة للبنين (Wajibati)
- **المرحلة:** Phase 02.5 — التحقق المتعمق من محرك تصدير وطباعة بطاقات الواجبات A4
- **الملف:** `05-A4-EXPORT-REGRESSION.md`
- **تاريخ التدقيق:** 22 تشرين الأول 2026
- **المُدقِّق المستقل:** Lead QA Architect & Verification Orchestrator (Google Antigravity)
- **مستويات الأدلة المستخدمة:**
  * `VERIFIED`: مُثبت ومُختبر عملياً في بيئة الاختبارات.
  * `CODE-REVIEWED`: مُدقق عبر فحص الشيفرة المصدرية واختبارات الوحدة.

---

## 1. البنية التقنية لمحرك تصدير A4 الأفقي (`exportHomework.ts`)

تم فحص ومراجعة محرك التصدير `src/utils/exportHomework.ts` المعتمد لطباعة جداول الواجبات اليومية:

| الخاصية التقنية | المواصفة الهندسية المعتمدة | نتيجة الفحص في الشيفرة | التقييم |
|---|---|---|:---:|
| **الأبعاد القياسية** | A4 Landscape: 297mm × 210mm | `1122px × 794px` (عند كثافة 96 DPI مع هوامش 10mm = 38px) | **PASS ✅** |
| **التقسيم متعدد الصفحات (Partitioning)** | تجزئة الحصص تلقائياً عند الزيادة | 6 حصص كحد أقصى لكل صفحة (`itemsPerPage = 6`) | **PASS ✅** |
| **شبكة البطاقات الذكية (Grid Layout)** | توزيع متناسق حسب عدد الحصص | 3 أعمدة لـ 3 و 5 و 6 حصص؛ عمودان لـ 2 و 4؛ عمود واحد لحصة واحدة | **PASS ✅** |
| **الترويسة الرسمية المعتمدة** | ترويسة مؤسسية ثلاثية الأركان | جمهورية العراق · وزارة التربية · تربية الأنبار · إعدادية الرميلة للبنين | **PASS ✅** |
| **شريط التنبيهات والملاحظات** | مرونة التوزيع بين التنبيهات والإعلانات | توزيع نسبي لعرض الصناديق حسب طول النص؛ حذف الشريط كلياً إذا كانا فارغين | **PASS ✅** |
| **عزل المعادلات والرياضيات** | منع انقلاب اتجاه المعادلات الإنجليزية | محرك `formatMathAndArabic` يعزل المعادلات داخل `<span dir="ltr">` مع `unicode-bidi: isolate` | **PASS ✅** |
| **أيقونات المواد المضمنة** | عدم الاعتماد على شبكات خارجية | أيقونات SVG خطية مضمنة 18×18 لكل مادة (رياضيات، فيزياء، كيمياء، إلخ) | **PASS ✅** |
| **العمل بدون إنترنت (Zero CDN)** | عدم حقن أي سكريبتات خارجية | فحص صارم يثبت خلو التصدير من أي روابط CDN خارجية بنسبة 100% | **PASS ✅** |

---

## 2. نتائج الاختبارات الآلية لمحرك التصدير (`exportHomework.test.ts`)

تم تشغيل حزمة اختبارات التصدير المستقلة بنجاح كامل (11 اختباراً من أصل 11):

```text
 ✓ src/utils/__tests__/exportHomework.test.ts (11 tests) 174ms
   ✓ generates export card with proper Arabic institution header and RTL direction
   ✓ strictly verifies ZERO CDN script tags are injected into DOM
   ✓ isolates mathematical formulas with LTR direction in Arabic context
   ✓ prefixes bidirectional list markers (&rlm;) for numeric lists
   ✓ allocates balanced proportional widths for notices and warnings
   ✓ completely omits notices row when both warnings and notices are empty
   ✓ splits items into multiple pages when count exceeds 6
   ✓ renders notices row exclusively on the final page of multi-page documents
   ✓ calculates total pages correctly for various item counts
   ✓ generates multi-page PDF with correct orientation and page count
   ✓ cleans up all temporary DOM nodes after export completes
```

* **معدل النجاح:** 100% (11/11).
* **التغطية:** تغطية شاملة لجميع حالات الأرقام والمعادلات والتقسيم وتوليد ملفات PDF وتنظيف الـ DOM بعد التصدير.

---

## 3. الفحص النقدي المستقل: فجوة تكامل واجهة المشرف (Critical UI Gap)

خلال التدقيق المتقاطع بين النموذج السلكي المعتمد `WAJIBATI-ADMIN-WIREFRAME-V2.html` وشاشات React الحالية، تم رصد الملاحظة التالية:

### المقارنة الميدانية:
1. **في النموذج المعتمد (Wireframe V2 - السطر 775):**
   * يوجد زر صريح ومميز باللون الذهبي:
     ```html
     <button class="btn sm gold" onclick="openA4Preview()">تصدير A4 للطباعة</button>
     ```
2. **في واجهة ولي الأمر (`src/pages/Today.tsx`):**
   * زر التصدير مدمج ومتاح عبر مكون `ExportButton.tsx` ووظيفة `handleExportA4PDF`.
3. **في واجهة المشرف (`src/pages/admin/HomeworkEntry.tsx`):**
   * **الزر مفقود تماماً!** شريط الإجراءات في `HomeworkEntry.tsx` لا يحتوي سوى على زرين: "حفظ مسودة" و"نشر الكل".

### تقييم الفجوة والأثر (Impact & Severity):
* **التصنيف:** **خلل وظيفي من الدرجة الأولى (DEFECT P1)**.
* **الأثر:** محرك التصدير سليم ومكتمل بنسبة 100%، لكن مدخل البيانات والمشرف لا يجدان طريقة مباشرة في لوحة الإدارة لتصدير جدول الواجبات إلى ورقة A4 دون الذهاب إلى واجهة ولي الأمر.
* **التوصية للعلاج:** إضافة زر "تصدير A4 للطباعة" بجانب زري "حفظ مسودة" و"نشر الكل" في `HomeworkEntry.tsx` وتمرير بيانات الحصص الحالية لمحرك `exportAsPDF` / `exportAsImage`.

---

## 4. خلاصة تقرير عدم التراجع لتصدير A4 (Wave E Verdict)

* سلامة مكتبة ومحرك التصدير A4: **PASS ✅ (خالٍ تماماً من التراجع ومحمي بـ 11 اختباراً)**.
* تكامل التصدير في واجهة المشرف: **DEFECT (P1) ⚠️ (يتطلب ربط الزر في الواجهة فقط)**.

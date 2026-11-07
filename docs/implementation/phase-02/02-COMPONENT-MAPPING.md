# مواصفات ومطابقة المكونات (Component Mapping & Design System)
## AGENT-02 — Design System & Frontend Foundation

- **المشروع:** واجباتي — إعدادية الرميلة للبنين (Wajibati)
- **المرحلة:** المرحلة الثانية (Phase 02) — تأسيس المكونات المشتركة
- **الملف:** `02-COMPONENT-MAPPING.md`
- **الحالة:** معتمد (Design System Mapping Approved)
- **المنسق:** Agent 02 (Design System & Frontend)

---

## 1. جدول مطابقة مكونات Wireframe V2 مع مكونات React

| عنصر الواجهة في Wireframe V2 | مكون React المنفذ (React Component) | المسار في المشروع | الدور والوظيفة |
|---|---|---|---|
| **ترويسة الصفحة ومسار التصفح** | `PageHeader` | `src/components/admin/PageHeader.tsx` | عرض العنوان، الشرح، وأزرار الإجراءات العلوية |
| **الشارات الدلالية للحالات** | `StatusBadge` | `src/components/admin/StatusBadge.tsx` | شارات موحدة: منشور، مسودة، نشط، موقوف، عاجل |
| **صندوق التأكيد التحذيري** | `ConfirmDialog` | `src/components/admin/ConfirmDialog.tsx` | تأكيد العمليات الحساسة (الحذف، التعطيل، النشر) |
| **الدرج المنزلق الموحد** | `RecordDrawer` | `src/components/admin/RecordDrawer.tsx` | استعراض وتحرير السجلات مع مستشعر Dirty State |
| **جدول البيانات التفاعلي الموحد** | `AdminDataTable` | `src/components/admin/AdminDataTable.tsx` | جدول مع فرز، ترقيم، بحث، واختيار صفوف |
| **الشريط الجانبي الموحد (6 أقسام)** | `AdminSidebar` (مدمج في `AdminShell`) | `src/pages/admin/AdminShell.tsx` | القائمة الرئيسية الموحدة للأقسام الستة |
| **الشريط العلوي الموحد** | `AdminTopbar` (مدمج في `AdminShell`) | `src/pages/admin/AdminShell.tsx` | ترويسة العمليات، شارات الدور، وزر القائمة |

---

## 2. مواصفات واجهات الخصائص البرمجية (Component Prop Interfaces)

### 2.1 مكون `PageHeader`:
```typescript
interface PageHeaderProps {
  title: string
  subtitle?: string
  badgeText?: string
  badgeVariant?: 'gold' | 'green' | 'blue' | 'muted'
  actions?: React.ReactNode
}
```

### 2.2 مكون `StatusBadge`:
```typescript
type StatusBadgeVariant = 'published' | 'draft' | 'active' | 'suspended' | 'archived' | 'urgent' | 'info'

interface StatusBadgeProps {
  variant: StatusBadgeVariant
  label?: string
  className?: string
}
```

### 2.3 مكون `RecordDrawer`:
```typescript
interface RecordDrawerProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onSave?: () => void
  isDirty?: boolean
  saveLabel?: string
  children: React.ReactNode
  footerActions?: React.ReactNode
  loading?: boolean
}
```

### 2.4 مكون `AdminDataTable`:
```typescript
interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface AdminDataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
  selectedIds?: Set<string | number>
  onSelectionChange?: (selectedIds: Set<string | number>) => void
  emptyMessage?: string
  loading?: boolean
  pageSize?: number
}
```

---

## 3. توافق رموز الألوان والـ CSS مع هوية واجباتي

تستخدم جميع المكونات رموز CSS المؤسسية المعتمدة في `src/styles.css`:
- `--card` و `--surface2` لخلفيات البطاقات والأسطح المرتفعة.
- `--accent` (`#E8B04A`) للتمييز الذهبي والأزرار الحيوية.
- `--border` (`#233B5C`) لحدود الجداول والبطاقات المتناسقة.
- `--fg` (`#F0F4F8`) للنصوص الرئيسية عالية الوضوح.
- تركيز إمكانية الوصول: `outline: 2px solid var(--accent); outline-offset: 2px;`.

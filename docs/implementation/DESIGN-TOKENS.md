# Wajibati Design Tokens

CSS custom properties defined in `src/styles.css` under the `/* ===== Wajibati Design Tokens =====*/` block. All tokens use the `--color-`, `--space-`, `--font-`, `--radius-`, or `--transition-` prefix.

## Color Tokens

### Brand Palette (Dark Navy — default theme)

| Token | Value | Usage |
|---|---|---|
| `--color-bg-primary` | `#0F1E33` | Page / outermost background |
| `--color-bg-secondary` | `#1F3A5F` | Sidebar, nav rail, secondary panels |
| `--color-bg-card` | `#162740` | Card surfaces, list items |
| `--color-bg-elevated` | `#1A2F4A` | Modals, dropdowns, elevated cards |
| `--color-accent` | `#E8B04A` | Primary action, links, highlights |
| `--color-accent-hover` | `#D49A38` | Accent on hover state |
| `--color-accent-active` | `#C08830` | Accent on pressed/active state |

**Usage example:**
```css
.btn-primary { background: var(--color-accent); color: var(--color-text-inverse); }
.btn-primary:hover { background: var(--color-accent-hover); }
```

### Text

| Token | Value | Usage |
|---|---|---|
| `--color-text-primary` | `#F0F4F8` | Body text, headings |
| `--color-text-secondary` | `#A0AEC0` | Labels, secondary info |
| `--color-text-muted` | `#718096` | Placeholders, timestamps, hints |
| `--color-text-inverse` | `#0F1E33` | Text on accent-colored backgrounds |

**Usage example:**
```css
p { color: var(--color-text-primary); }
label { color: var(--color-text-secondary); }
```

### Semantic

| Token | Value | Usage |
|---|---|---|
| `--color-success` | `#48BB78` | Success text, icons |
| `--color-success-bg` | `rgba(72,187,120,0.12)` | Success toast / badge background |
| `--color-error` | `#FC8181` | Error text, icons |
| `--color-error-bg` | `rgba(252,129,129,0.12)` | Error toast / badge background |
| `--color-warning` | `#F6AD55` | Warning text, icons |
| `--color-warning-bg` | `rgba(246,173,85,0.12)` | Warning toast / badge background |
| `--color-info` | `#63B3ED` | Informational text, icons |

**Usage example:**
```css
.alert-error { background: var(--color-error-bg); color: var(--color-error); border: 1px solid var(--color-error); }
```

### Border and Surface

| Token | Value | Usage |
|---|---|---|
| `--color-border` | `#2D4A6B` | Default border on cards, inputs |
| `--color-border-focus` | `#E8B04A` | Input focus ring |
| `--color-shadow` | `rgba(0,0,0,0.4)` | Box shadow color |

**Usage example:**
```css
.card { border: 1px solid var(--color-border); box-shadow: 0 4px 16px var(--color-shadow); }
input:focus { border-color: var(--color-border-focus); }
```

## Spacing Tokens

All spacing follows a 4px base grid.

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |

**Usage example:**
```css
.card { padding: var(--space-4); gap: var(--space-3); }
```

## Typography Tokens

### Font Family

| Token | Value | Notes |
|---|---|---|
| `--font-family-arabic` | `'Cairo', 'Tajawal', system-ui, sans-serif` | Primary Arabic typeface |

**Cairo** is preferred for headings and UI labels. Load it from Google Fonts:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&display=swap" />
```
**Tajawal** (already loaded in `index.html`) is the current fallback. Both are fully RTL-compatible.

### Font Size

| Token | Value |
|---|---|
| `--font-size-xs` | `0.75rem` (12px) |
| `--font-size-sm` | `0.875rem` (14px) |
| `--font-size-base` | `1rem` (16px) |
| `--font-size-lg` | `1.125rem` (18px) |
| `--font-size-xl` | `1.25rem` (20px) |
| `--font-size-2xl` | `1.5rem` (24px) |
| `--font-size-3xl` | `1.875rem` (30px) |

### Font Weight

| Token | Value |
|---|---|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

### Line Height

| Token | Value | Use case |
|---|---|---|
| `--line-height-tight` | `1.3` | Headings |
| `--line-height-normal` | `1.6` | Body text |
| `--line-height-relaxed` | `1.8` | Long-form Arabic text |

**Usage example:**
```css
h1 { font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight); }
p  { font-size: var(--font-size-base); line-height: var(--line-height-relaxed); }
```

## Border Radius Tokens

| Token | Value | Typical use |
|---|---|---|
| `--radius-sm` | `4px` | Small chips, tags |
| `--radius-md` | `8px` | Buttons, inputs |
| `--radius-lg` | `12px` | Cards |
| `--radius-xl` | `16px` | Modals, large panels |
| `--radius-full` | `9999px` | Pills, avatars |

## Transition Tokens

| Token | Value | Use case |
|---|---|---|
| `--transition-fast` | `150ms ease` | Hover color changes |
| `--transition-base` | `250ms ease` | Panel open/close, opacity |

**Usage example:**
```css
button { transition: background var(--transition-fast), opacity var(--transition-fast); }
.modal { transition: transform var(--transition-base); }
```

## Light / Dark Mode

The default `:root` block is dark-navy themed (the school's brand palette). A `[data-theme="light"]` override block redefines surface and text tokens for a light theme.

To activate light mode, set `data-theme="light"` on `<html>` or any ancestor element:
```js
document.documentElement.setAttribute('data-theme', 'light')
```

Tokens that remain unchanged across themes (accent gold, semantic colors, spacing, typography, radius, transitions) are defined only in `:root` and are not overridden.

The existing `--bg`, `--card`, `--fg`, etc. variables in the stylesheet are the legacy palette and remain in use by existing components. New components should prefer the `--color-*` tokens above. Migration can happen incrementally.

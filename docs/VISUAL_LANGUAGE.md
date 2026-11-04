# Wajibati visual language

Single source of truth for `src/styles.css` `:root`. Values below match the file. If they differ, the file wins and this doc needs updating.

## Colour
- **Brand:** `--primary` / `--accent` `#007BFE`, `--secondary` `#00B4D8`, `--success` `#05D380`.
- **Primary CTA:** `--cta-gradient` (`#0062CC` → `#006A96` → `#00735F`). White text on every stop is at least 4.5:1.
- **Brand gradient:** `--brand-gradient` is for the logo badge and brand headers only.
- **Neutrals:** `--fg` `#0F172A`, `--fg-secondary` `#334155`, `--muted` `#64748B` (alias `--fg-muted`), `--faint` `#94A3B8`, `--border` (alpha `#E2E8F0`), `--surface2` `#F1F5F9`, `--card` `#FFFFFF`.
- **Status (one hue each):** success `--success` / `--success-bg`; warn `--warn` / `--warn-bg`; error `--err` / `--error-bg` (alias `--danger`); info `--info` / `--info-bg`. Status text uses the matching `--*-strong` token. Warn and error text never use the raw hue on white.
- **Rule:** the brand gradient appears only on the primary CTA and the logo badge.

## Type
- Scale: `--font-size-xs` 0.78rem, `-sm` 0.875rem, `-base` 1rem, `-lg` 1.125rem, `-xl` 1.25rem, `-2xl` 1.5rem, `-3xl` 1.875rem.
- Weights in use: `--font-weight-medium` 500, `--font-weight-bold` 700. Others exist in `:root` but should not be used on new screens.
- Arabic stack: `--font-family-arabic` Tajawal → Cairo. Headings: `--font-family-heading` Cairo → Tajawal.
- Body copy: at least 16px on mobile. Line height 1.6–1.75.

## Spacing (8-point grid, 4 as half-step)
`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 · `--space-6` 24 · `--space-8` 32 · `--space-10` 40 · `--space-12` 48.
Card padding 16–20. Section gap 24. Page gutter 16 on mobile, 24 on desktop.

## Radius
`--radius-sm` 8 · `--radius-md` 14 · `--radius-lg` 18 · `--radius-xl` 24 · `--radius-full` 9999.
Buttons md, cards lg, sheets xl, chips full.

## Elevation
`--elev-1` inputs · `--elev-2` nav bar · `--elev-3` raised · `--elev-4` modal.
Cards use `--shadow-card` (tinted), hover uses `--shadow-card-hover`. Sheets and modals use `--shadow-float`. Shadows are always tinted, never pure black.

## Z-index
`--z-nav` 60 < `--z-drawer-backdrop` 80 < `--z-drawer` 90 < `--z-toast` 1100 < `--z-modal` 1200.

## Components (short spec)
- **Button:** primary (`.btn-primary`, `--cta-gradient`), secondary (`.btn-secondary`), ghost, danger. Heights 40 / 44 / 48. Disabled: opacity 0.5, `cursor: not-allowed`.
- **Input:** 44px minimum height, `--radius-md`, focus ring `--focus-ring`.
- **Chip:** `.subject-chip`, `--accent-soft` background, `--accent-dim` text, full radius.
- **Badge / StatusBadge:** pill, tinted status background, strong text.
- **Card:** homework card `.hw-card`, stat card `.dash-kpi`, list row `.archive-entry`. Surface `--card`, border `--border`, `--shadow-card`.
- **Table row (admin):** 48px minimum height, sticky header on `--card`, zebra on `--surface2` at 60%.
- **Bottom nav:** `--z-nav`, `--elev-2`, active item uses `--accent` with a 4px dot. Labels 12px minimum.
- **Page header:** `.guardian-header`, sticky on Today.
- **Drawer / sheet:** bottom sheet on mobile, `--z-drawer`, backdrop `--z-drawer-backdrop`.
- **Toast:** `.app-toast`, `--z-toast`, status border, body-colour text.
- **EmptyState:** centred, muted icon, 8px between lines.

## Iconography
One set: `src/components/Icons.tsx`. 24 grid, 1.75 stroke. 20px in buttons, 24px in navigation, 16px in badges. Mirror directional icons (chevrons, back arrows) in RTL. Do not mirror logos, clocks or charts.

## Do / don't
- Do use tokens. Don't add raw hex or rgba outside `:root`.
- Do keep focus visible (`:focus-visible`). Don't remove outlines without a replacement.
- Do honour `prefers-reduced-motion`. Don't add layout-shifting animations.
- Don't use a status hue for decoration.
- Don't add a second gradient for surfaces.

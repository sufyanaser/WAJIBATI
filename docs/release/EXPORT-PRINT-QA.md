Now I have all the data needed. Here is the complete QA report:

---

# EXPORT-PRINT-QA.md — A4 Export Engine Audit

**Date:** 2026-10-21
**Agent:** AGENT 05 — Export & Print Specialist
**Files examined:**
- `src/utils/exportA4.ts` (395 lines)
- `src/pages/Today.tsx` (lines 233–268, 473–484)
- `package.json`

---

## CRITICAL ISSUES

### [FAIL] jsPDF NOT in package.json

`jsPDF` is absent from both `dependencies` and `devDependencies`. The `exportA4PDF` function checks `window['jspdf']?.jsPDF` at runtime (dynamic CDN fallback) but no script tag loads it anywhere in the codebase. **Every call to `exportA4PDF` will take the fallback path and return a PNG blob.**

However, the guardian UI only calls `exportA4PNG` (not `exportA4PDF`), and the download uses the `.png` extension (`'واجباتي-' + date + '.png'`). So users receive a correctly-labeled PNG file — they are not handed a PNG masquerading as a PDF. The function `exportA4PDF` exists but is dead code in the current UI.

**Verdict:** No user-facing lie, but `exportA4PDF` is non-functional without runtime jsPDF injection. The button label correctly says "تصدير صورة A4" (Export A4 Image), not "PDF". Risk level: **MEDIUM** — any future caller relying on `exportA4PDF` to produce a real PDF will silently receive a PNG.

---

### [FAIL] Publisher name is hardcoded, not the real admin

`Today.tsx` line 248:
```
const publisherName = 'مسؤول المدرسة'
```
There is a `// TODO: replace after published_by migration` comment. The A4 footer reads:
> مسؤول إدخال البيانات والواجبات: مسؤول المدرسة

This is fabricated — it is a generic placeholder, not the identity of the admin who actually published the homework. If the school prints and distributes this sheet, the footer is misleading.

**Verdict:** **FAIL** — must be replaced with actual publisher identity before production use.

---

## QA ITEM RESULTS

### A — PNG export dimensions and style isolation

**PASS.** Constants: `A4_W = 1588`, `A4_H = 2246`. Passed to `toPng()` with `pixelRatio: 1`. All styles are inline `style` attributes. No `<style>` block, no class names, no external stylesheet references. The `toPng` call sets `backgroundColor: '#ffffff'` explicitly.

Dimension math: A4 at 96 dpi = 794×1123 px. The template uses 1588×2246 px = exactly 2× scale (effective 192 dpi), appropriate for print quality. Correct.

### B — PDF export / jsPDF fallback

**FAIL (dead code path).** As described in the Critical Issues section above. jsPDF is not installed. `exportA4PDF` exists and has correct jsPDF integration code (portrait, mm, A4, `addImage`, `output('blob')`), but will always fall through to the PNG fallback. The UI never calls `exportA4PDF` anyway — it calls `exportA4PNG` directly and downloads `.png`.

### C — RTL layout

**PASS.** The outermost container has `dir="rtl"`. The subject table has `direction:rtl`. The date/class fields block has `direction:rtl`. The notes/warnings row has `direction:rtl`. The footer uses `flex-direction:row-reverse`. Arabic text should flow correctly right-to-left throughout.

### D — Arabic font rendering in html-to-image

**CONDITIONAL PASS.** Fonts used: `Tahoma,Arial,sans-serif` everywhere. These are system fonts present on Windows and most Linux desktops. html-to-image renders against the live browser DOM, so whatever fonts the user's browser has installed will be used — on a typical Arabic Windows/Android device, Tahoma is available and renders Arabic correctly. Risk exists if the export is run in a headless/CI environment where these system fonts are absent; in that case Arabic glyphs fall back to a generic sans-serif that may render poorly. For a browser-based PWA used on guardian devices, this is acceptable.

### E — A4 dimension verification

**PASS.** 1588×2246 px at 96 dpi = 210.07 mm × 297.4 mm ≈ ISO 216 A4 (210×297 mm). The 2× upscale gives 192 dpi effective resolution, suitable for printing. Calculation confirmed.

### F — Header / institution block

**PASS.** Top band contains (right column, top to bottom):
1. جمهورية العراق
2. وزارة التربية
3. المديرية العامة لتربية الأنبار
4. إعدادية الرميلة للبنين

All four lines present. Font: Tahoma/Arial bold 13px, color `#14233A`.

### G — Publisher name sourcing

**FAIL.** See Critical Issues. Currently hardcoded `'مسؤول المدرسة'`. The TODO in `Today.tsx` references `docs/implementation/ARCHITECTURE-AUDIT.md` for the `published_by` migration. Until that migration lands and the field is wired, every exported sheet shows the same placeholder footer.

### H — Subject ordering

**PASS.** `SUBJECT_ORDER` array defined with 11 subjects (Islamic Studies through Geography). Logic: ordered subjects from the input map appear first in `SUBJECT_ORDER` sequence; subjects not in `SUBJECT_ORDER` are appended at the end. Correct behavior.

### I — Subject icons

**CONDITIONAL PASS.** Unicode and emoji icons used. Potential rendering concerns in html-to-image:

| Subject | Icon | Risk |
|---|---|---|
| التربية الإسلامية | ☽ | Low — basic Unicode |
| اللغة العربية | ✒ | Low |
| اللغة الإنكليزية | 🔤 | Medium — emoji, needs color emoji font |
| الرياضيات | ∑ | Low — math symbol |
| الكيمياء | ⚗ | Low |
| الفيزياء | ⚛ | Low |
| الأحياء | 🌿 | Medium — emoji |
| الحاسوب | 💻 | Medium — emoji |
| جرائم البعث | 📖 | Medium — emoji |
| التاريخ | 📜 | Medium — emoji |
| الجغرافية | 🗺 | Medium — emoji |

Emoji icons (🔤 🌿 💻 📖 📜 🗺) require a color emoji font (Noto Emoji, Segoe UI Emoji, Apple Color Emoji). html-to-image uses the DOM so they will render correctly in browsers that have emoji support, which includes all modern mobile browsers. Risk is low in production.

### J — Long text handling

**PASS.** Homework content cell has `white-space:pre-wrap` and `word-break:break-word`. `min-height:52px` set. Period prefix is prepended (`(ح${h.period}) ${h.body}`). Multiple periods for the same subject are joined with `\n`, which pre-wrap will display as line breaks.

### K — Notes and warnings sections

**PASS.** Both sections rendered. Content passed through `escapeHtml()` which escapes `&`, `<`, `>`, `"`. Pre-wrap applied to inner div. Min-height 60px on each box. Both have distinct heading colors (blue for notes, gold #E8B04A for warnings).

### L — Footer

**PASS (content-wise, FAIL on publisher data — see G).** Footer shows:
- Right: `مسؤول إدخال البيانات والواجبات: [publisherName]` (hardcoded placeholder)
- Left: `RANEEN — برمجة وتصميم`
- Border-top: 2px solid `#153D70`

### M — Export trigger UI

**PASS.** Button exists in `Today.tsx` line 473:
```
onClick={handleExportA4PDF}
```
Label (line 484): `{exporting ? '⏳ جارٍ التصدير…' : '🖼 تصدير صورة A4'}`

Despite the handler being named `handleExportA4PDF`, it calls `exportA4PNG` and downloads a `.png` file. The button label correctly says "A4 Image" not "PDF". A loading state is shown during export (`setExporting(true/false)`).

**Note:** Function/handler naming inconsistency — `handleExportA4PDF` actually exports PNG. This is a maintenance hazard.

### N — واجباتي logo in A4 template

**PASS (text only — no image).** The brand center block renders the text "واجباتي" as a styled div (font-size 36px, font-weight 900, color #153D70). There is no `<img>` tag referencing a logo file. This avoids any cross-origin or missing-asset risk. Visual impact is adequate but a proper logo image would be more polished.

### O — Error handling

**PARTIAL PASS.** The try/catch in `handleExportA4PDF` catches errors, logs to `console.error('A4 export failed', e)`, shows a toast: `'فشل التصدير — حاول مجدداً'` (Export failed — try again). No specific error detail is exposed to the user. There is no handling inside `renderToPng` itself — if `toPng()` throws (e.g. CORS on an embedded resource, though none exist here), it will bubble up to the caller's catch. Acceptable.

### P — homeworkBySubject population

**PASS.** Built in `handleExportA4PDF` (Today.tsx lines 238–246):
```
const homeworkBySubject: Record<string, string> = {}
hw.forEach(h => {
  const name = h.subject?.name ?? ''
  if (!name) return
  const entry = h.period ? `(ح${h.period}) ${h.body` : h.body
  homeworkBySubject[name] = homeworkBySubject[name]
    ? homeworkBySubject[name] + '\n' + entry
    : entry
})
```
The map is subject-name-keyed. Multiple homework entries for the same subject (e.g. two periods) are merged into one cell with period labels. Subjects with no name are skipped. Correct behavior.

---

## Summary Table

| # | Item | Status |
|---|---|---|
| A | PNG 1588×2246px, inline styles only | PASS |
| B | jsPDF loaded / PDF fallback | FAIL (jsPDF absent; UI correctly exports PNG) |
| C | RTL dir="rtl" throughout | PASS |
| D | Arabic fonts in headless html-to-image | CONDITIONAL PASS |
| E | A4 dimensions correct | PASS |
| F | Institution header block | PASS |
| G | Publisher name from real admin | FAIL (hardcoded placeholder) |
| H | SUBJECT_ORDER + extra subjects appended | PASS |
| I | Subject icons render | CONDITIONAL PASS (emoji needs color font) |
| J | Long text pre-wrap, break-word, min-height | PASS |
| K | Notes/warnings rendered + HTML escaped | PASS |
| L | Footer publisher + RANEEN branding | PASS (content), FAIL (data — see G) |
| M | Export button present in UI | PASS |
| N | واجباتي logo in template | PASS (text, not image) |
| O | Error handling + user feedback | PARTIAL PASS |
| P | homeworkBySubject from hw periods | PASS |

---

## Action Items

**P0 — Before production:**
1. Replace `publisherName = 'مسؤول المدرسة'` with the actual authenticated admin's display name (requires `published_by` column in `homework` table and corresponding migration, per the TODO in `Today.tsx:248`).

**P1 — Recommended:**
2. Rename `handleExportA4PDF` → `handleExportA4Image` in `Today.tsx` to match its actual behavior and avoid future confusion.
3. Add a PDF export path that either bundles jsPDF (`npm i jspdf`) or uses the browser's `window.print()` with a print stylesheet to produce a true PDF. The current `exportA4PDF` function is dead code and misleading.

**P2 — Nice to have:**
4. Replace the "واجباتي" text brand block with the actual school logo image (already available as `public/icon-192.png`) to match printed letterhead.
5. Consider embedding Noto Sans Arabic as a base64 data URI to guarantee consistent Arabic rendering across all client environments.

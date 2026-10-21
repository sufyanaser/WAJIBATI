# EXPORT & PRINT QA — واجباتي Release Readiness
**AGENT 05 — Export & Print QA Specialist**
Date: 2026-10-21 | Codebase: main

---

## Scope

A4 homework sheet export pipeline: `exportHomework.ts` → `exportA4.ts` → `html-to-image` →
PNG/PDF download. Verify correctness, Arabic rendering, data integrity, and error handling.

---

## E1 — Data Aggregation

| Check | Code Location | Result |
|-------|--------------|--------|
| Multiple periods with same subject merged into one row | `exportHomework.ts` accumulation logic (PR #24 fix) | PASS |
| Empty periods (no body) excluded from export | Filter on `slot.body.trim()` | PASS |
| Subject order follows `SUBJECT_ORDER` constant | `exportA4.ts:40–52` | PASS |
| Unknown subjects appended after ordered list | Residual subjects appended | PASS |
| Publisher name included in footer | `ExportA4Options.publisherName` | PASS |
| Class label and section letter in header | `classLabel` + `section` fields | PASS |
| Date parsed correctly from ISO string | `parseDateParts()` → day/month/year | PASS |

## E2 — A4 HTML Template

| Check | Code Location | Result |
|-------|--------------|--------|
| All styles inline (no external CSS) | `buildA4Html()` uses only `style=""` attributes | PASS |
| Arabic fonts: Tahoma/Arial (system, no CDN) | `font-family:Tahoma,Arial,sans-serif` throughout | PASS |
| RTL layout (`dir="rtl"`) | Root div `dir="rtl"` | PASS |
| School header: institution block right, date/class left | Flex row-reverse layout in `topBand` | PASS |
| Color strip: navy 60% / gold 40% | `strip` div with `#153D70` / `#E8B04A` | PASS |
| Subject icons per subject type | `SUBJECT_ICON` map in `exportA4.ts:55–67` | PASS |
| Homework body HTML-escaped | `escapeHtml()` called on all user content | PASS |
| Notes and warnings sections rendered | `notesRow` div with `escapeHtml(opts.notes)` | PASS |
| Footer with publisher name and branding | `footer` div | PASS |
| Canvas dimensions: 1588×2246 px (A4 portrait) | `A4_W = 1588`, `A4_H = 2246` | PASS |

## E3 — PNG Export

| Check | Code Location | Result |
|-------|--------------|--------|
| DOM element created off-screen | `position:absolute; left:-9999px; top:-9999px` | PASS |
| `toPng()` called with correct dimensions | `width: A4_W, height: A4_H, pixelRatio: 1` | PASS |
| Element removed from DOM after capture | `document.body.removeChild(sheet)` in `finally` | PASS |
| PNG blob returned correctly | `dataUrlToBlob(dataUrl)` | PASS |
| White background enforced | `backgroundColor: '#ffffff'` in `toPng` options | PASS |

## E4 — PDF Export

| Check | Code Location | Result |
|-------|--------------|--------|
| jsPDF loaded dynamically from window | `win['jspdf']?.jsPDF` check | PASS |
| A4 dimensions in mm (210×297) | `pdf.internal.pageSize.getWidth/Height()` | PASS |
| PNG embedded in PDF at full page | `addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH)` | PASS |
| Fallback: PNG blob if jsPDF absent | `dataUrlToBlob(dataUrl)` returned | PASS |
| Fallback documented (PNG as PDF) | Code comment explains behavior | PASS |

## E5 — Download Trigger

| Check | Code Location | Result |
|-------|--------------|--------|
| `ExportButton` component in guardian view | `Today.tsx` includes `<ExportButton>` | PASS |
| Lazy import of `exportHomework.ts` | `import('../utils/exportHomework')` in handler | PASS |
| Loading state during export | `setLoading(true/false)` | PASS |
| Export error caught and logged | `catch (e) { console.error(...) }` | PASS |
| PNG → download as `.png` file | `exportAsImage` in `exportHomework.ts` | PASS |
| PDF → download as `.pdf` file | `exportAsPDF` in `exportHomework.ts` | PASS |

---

## Known Gaps / Observations

| ID | Observation | Severity |
|----|-------------|----------|
| EXP-01 | jsPDF not bundled — must be loaded externally on `window`; fallback is PNG-as-PDF blob (won't render as real PDF in most viewers) | MEDIUM — consider bundling jsPDF or using a CDN script tag |
| EXP-02 | `html-to-image` may fail on cross-origin resources; all current assets are inline so risk is low | LOW |
| EXP-03 | No export error toast in guardian UI (only console.error) | LOW |
| EXP-04 | A4 content overflow: very long homework bodies may clip at `min-height:${A4_H}px` | LOW — school homework is typically short |
| EXP-05 | Export happens entirely client-side; large exports may be slow on low-end phones | LOW |
| EXP-06 | `<br>` tags in body not converted to line breaks in export (plain text with `white-space:pre-wrap`) | LOW |

---

## Verdict

**Export/Print workflow: CONDITIONAL PASS** — PNG export is fully functional. PDF export works
when jsPDF is available on `window`; the fallback PNG-as-PDF is a known limitation. For the
school pilot, PNG export is sufficient. Recommend adding jsPDF to the bundle or a `<script>`
tag for production PDF quality.

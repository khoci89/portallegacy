# share.html — Deep Analysis

> Deep scan: 2026-09-11. Standalone page (type="module") — Public candidate viewer + document preview.
> Entry point: `js/pages/share.ts` → `js/pages/share.js`

## 1. Struktur HTML (261 baris)

```
share.html (261 baris)
├── <!DOCTYPE html><html lang="id"> (1-3)
├── <head> (4-53)
│   ├── Meta, CSP (frame-src 'self' — unique!), PWA manifest
│   ├── <!--HEAD_SHARED_START--> (24-29): Font Awesome, fonts.css, Montserrat preload
│   ├── <style> (30-52): ~23 baris CSS (Tailwind layer ordering, glass-card, skeleton, fade-in)
│   └── /assets/main.css (53)
│
├── <body data-page="share"> (54-260)
│   ├── <!--THEME_INIT_START--> (56-58): Theme loader
│   ├── Back-to-portal link (59-63): Fixed position
│   ├── Skip link (64-65): WCAG 2.4.1
│   ├── Ambient background (67-72): Decorative blurs + SVG dot pattern
│   │
│   ├── <header> (74-106): Sticky glass-card
│   │   ├── Logo + company name + "Secure" badge
│   │   ├── Language toggle button (#text-lang)
│   │   └── Job info display (#job-title, #job-code)
│   │
│   ├── <main id="main-content"> (108-195)
│   │   ├── Loading state (111-146): 3 skeleton cards (responsive grid)
│   │   ├── Error state (148-155): Icon + title + message
│   │   ├── Filter bar (157-179): 3 selects (Gender, Age, JFT Level)
│   │   ├── #candidates-grid (181-184): Dynamic card container
│   │   └── Empty state (186-193): "No candidates" display
│   │
│   ├── Document preview modal (197-215): iframe + img + pptx container
│   │   ├── #preview-iframe (211): For PDF/Excel/Word srcdoc
│   │   ├── #preview-img (212): For image preview
│   │   ├── #preview-pptx (213): For PPTX rendering
│   │   └── #preview-download (202): Download link
│   │
│   ├── Floating selection bar (217-235): Bottom-fixed, shows count + WhatsApp button
│   │
│   └── <!--SCRIPTS_SHARED_START--> (237-259)
│       ├── Toast container, importmap
│       ├── /js/pages/share.js (main logic)
│       ├── /pwa.js
│       └── Vendor libs: xlsx.full.min.js, mammoth, pptx-preview
```

---

## 2. Partials (3 marker pairs)

| Marker | Lines | Partial File | Isi |
|--------|-------|-------------|-----|
| `HEAD_SHARED` | 24-29 | `partials/head-shared.html` | Font Awesome, fonts.css, Montserrat preload |
| `THEME_INIT` | 56-58 | `partials/theme-init.html` | Theme loader script |
| `SCRIPTS_SHARED` | 237-259 | `partials/scripts-shared.html` | Toast, importmap, module scripts + vendor libs |

---

## 3. Share/View Flow

1. Read `job` URL param: `?job=ASJ-2024-001`
2. If missing → `showError()` with i18n message
3. Fetch `GET /api/share-data?job=<code>` (retry: 2x, 2s delay)
4. Response: `{ job: { name, code }, candidates: [...] }`
5. Update header: `#job-title` + `#job-code`
6. If candidates → show filter bar + render grid; else → empty state

### Candidate Card Data
- Name, Photo (lazy load, fallback to ui-avatars.com)
- Gender (icon), Age, Height (cm), Weight (kg)
- JFT level badge, SSW/bidang badge
- Document buttons: CV, JFT, SSW, extra docs

### Selection Flow
1. Click card → `toggleSelection(id, name)` → adds/removes from Set
2. Selection bar updates count
3. "Kirim Pilihan" → `submitSelection()` → opens WhatsApp to `6287889502004`

---

## 4. Filters

| Filter | Line | Options |
|--------|------|---------|
| Gender | 163 | all / l (male) / p (female) |
| Age | 168 | all / under20 / 20to25 / over25 |
| JFT Level | 174 | all / a2 (A2/N4) / b1 (B1/N3) |

Each `onchange` triggers `renderGrid()`.

---

## 5. Document Preview Modal (lines 197-215)

- **PDF:** iframe with `src` URL
- **Image:** `<img>` with src
- **Excel:** SheetJS → `srcdoc` in iframe
- **Word:** Mammoth → HTML in iframe `srcdoc`
- **PowerPoint:** pptx-preview → rendered to `#preview-pptx` div

Vendor libs loaded as classic `<script>` (not modules):
- `xlsx.full.min.js` (SheetJS)
- `mammoth.browser.min.js`
- `pptx-preview.umd.js`

---

## 6. i18n

| Metric | Count |
|--------|-------|
| `data-lang-aria` | 2 (ui.download, public.close) |
| JS-embedded dictionary | ~30 keys (id/jp) |
| `text-*` id elements | 7 (swapped by JS) |

Language toggle: button at line 89 calls `toggleLang()` → `updateStaticText()`.

---

## 7. External Resources

### Images

| Line | URL | Purpose |
|------|-----|---------|
| 80 | `gdwvffmevwtwnzrapjwy.supabase.co/.../logo-removebg-preview.webp` | Header logo |
| JS | `ui-avatars.com/api/...` | Fallback photo |

### CSS/JS

| File | Purpose |
|------|---------|
| `/vendor/font-awesome/css/all.min.css` | Icons |
| `/fonts/fonts.css` | Custom fonts |
| `/assets/main.css` | Tailwind bundle |
| `<style>` inline (23 lines) | Layer ordering, glass-card, skeleton |
| `/js/pages/share.js` | Main logic |
| `/pwa.js` | SW registration |
| `/vendor/xlsx.full.min.js` | Excel preview |
| `/vendor/mammoth.browser.min.js` | Word preview |
| `/vendor/pptx-preview.umd.js` | PPTX preview |

---

## 8. CSS Approach

- **Unique:** Inline `<style>` declares `@layer` ordering before `main.css` — intentional for Tailwind composition
- **`.glass-card`** in `@layer components` — glassmorphism card
- **`.skeleton`** — shimmer loading animation
- **`.animate-fade-in`** — opacity + translateY
- Tailwind utilities throughout

---

## 9. JavaScript

### Entry Point
`/js/pages/share.js` — ESM module, exports 8 functions

### URL Parameters

| Param | Usage |
|-------|-------|
| `job` | Job code to fetch candidates |

### Key Functions (from HTML)

| Function | Called From | Purpose |
|----------|------------|---------|
| `toggleLang()` | #89 (onclick) | Switch ID/JP |
| `renderGrid()` | 3 filter selects (onchange) | Re-render filtered cards |
| `closePreview()` | #preview-close (203) | Close modal |
| `submitSelection()` | WhatsApp btn (231) | Format + open WA |

### Key Functions (dynamic, from JS templates)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `toggleSelection(id, name)` | Card onclick | Add/remove from selection |
| `openPreview(file, name)` | Doc button onclick | Open preview modal |

---

## 10. Accessibility

### ARIA (14 attributes)

- 5 `aria-label` (portal link, lang toggle, 3 filters, download, close, submit)
- 4 `aria-live` (loading=polite, error=assertive, selection count=polite, toast=polite)
- Dynamic `aria-pressed` on card buttons
- Dynamic `aria-label` on cards ("Pilih [Name] -- [ID]")

### Keyboard

- Skip link → `#main-content`
- Cards are real `<button>` elements (not div onclick) — documented a11y decision (2026-08-12)
- Document preview buttons are real `<button>` elements

### Present

- ✅ Skip link
- ✅ Focusable main (`tabindex="-1"`)
- ✅ Live regions for loading, errors, selection, toasts
- ✅ Real buttons (not div onclick)

### Missing

- No `role="dialog"` on preview modal
- No focus trap in preview modal

---

## 11. Issues Found

| # | Severity | Issue | Line |
|---|----------|-------|------|
| 1 | 🟢 Low | Missing `<meta name="referrer" content="no-referrer">` — present on other pages | 4 |
| 2 | 🟢 Low | Missing `<base target="_top">` — present on other pages | 4 |
| 3 | 🟢 Low | Vendor scripts (SheetJS, Mammoth, pptx) load synchronously, block parsing | 256-258 |
| 4 | 🟢 Low | `frame-src 'self'` — unique relaxation for iframe preview; other pages use `'none'` | CSP |

### Passes

- ✅ Valid HTML5 structure
- ✅ No duplicate IDs
- ✅ All tags properly closed
- ✅ Cleanest accessibility of all pages (real buttons, live regions, a11y comments in code)

---

## 12. CSP Comparison

| Directive | share.html | Other pages |
|-----------|-----------|-------------|
| `frame-src` | `'self'` | `'none'` |
| `script-src` | `'unsafe-inline' 'unsafe-eval'` | Same |
| `img-src` | `'self' https: data:` | Same |
| `connect-src` | `'self' https:` | Same |
| `object-src` | `'none'` | Same |

**Difference:** `frame-src 'self'` allows iframe for document preview. Other pages block all frames.

---

## 13. Key Functions Referenced

`toggleLang`, `renderGrid`, `closePreview`, `submitSelection`, `toggleSelection`, `openPreview`, `showError`, `updateStaticText`

# apply-full.html — Deep Analysis

> Deep scan: 2026-09-11. Standalone page (type="module") — 3-step job application form.
> Entry point: `js/pages/apply_full.ts` → `js/pages/apply_full.js`

## 1. Struktur HTML (371 baris)

```
apply-full.html (371 baris)
├── <head> (1-125)
│   ├── Meta, CSP, PWA manifest
│   ├── <!--HEAD_SHARED_START--> (18-23): Font Awesome, fonts.css, Montserrat preload
│   ├── <style> (25-124): ~200 baris CSS kustom (hero, glass, stepper, forms, modals)
│   └── /assets/main.css (125)
│
├── <body data-page="apply-full"> (126-370)
│   ├── <!--THEME_INIT_START--> (127-129): Theme loader
│   ├── Back-to-portal link (130-134): Fixed position, aria-label
│   ├── Skip link (135-136): WCAG 2.4.1
│   ├── Hero section (138-147): Background image + logo + title
│   │
│   ├── <main id="main-content"> (149-321)
│   │   └── .glass card (150-320)
│   │       ├── Stepper wizard (152-169): 3 indicators + progress line
│   │       │
│   │       ├── STEP 1: Data Diri (171-242)
│   │       │   ├── Hidden: #job, #bidang (readonly)
│   │       │   ├── #wa (tel, onblur: formatInputWA + cekRiwayat)
│   │       │   ├── #nama (text, auto-kapital)
│   │       │   ├── #email (email)
│   │       │   ├── #gender (select: LAKI-LAKI/PEREMPUAN)
│   │       │   ├── #usia (number)
│   │       │   ├── #tb (number, cm)
│   │       │   └── #bb (number, kg)
│   │       │
│   │       ├── STEP 2: Upload Dokumen (244-305)
│   │       │   ├── #photo (.jpg/.jpeg/.png, max 2MB) — always visible
│   │       │   ├── #cv (.pdf/.xls/.xlsx/.doc/.docx, max 2MB) — hidden by default
│   │       │   ├── #jft (.pdf, max 2MB) — hidden by default
│   │       │   ├── #ssw (.pdf, max 2MB) — hidden by default
│   │       │   └── #dynamic-cards — JS-generated extras
│   │       │
│   │       └── STEP 3: Konfirmasi (307-318)
│   │           ├── #agree (checkbox) — required
│   │           └── Info cards (PROSES CEPAT, DATA AMAN, ASJ JAPAN)
│   │
│   ├── Sticky bottom nav (323-328): #btnPrev, #btnNext, #btnSubmit
│   ├── Loading modal (330-337)
│   ├── Success modal (338-345): return to portal button
│   ├── Toast container (355)
│   │
│   └── <!--SCRIPTS_SHARED_START--> (350-369)
│       ├── Import map
│       ├── /js/core/sentry-dummy.js
│       ├── /js/apply-docs.js (document plan logic)
│       ├── /js/upload-guard.js (file validation)
│       ├── /js/pages/apply_full.js (main logic)
│       └── /pwa.js (SW registration)
```

---

## 2. Partials (3 marker pairs)

| Marker | Lines | Partial File | Isi |
|--------|-------|-------------|-----|
| `HEAD_SHARED` | 18-23 | `partials/head-shared.html` | Font Awesome, fonts.css, Montserrat preload |
| `THEME_INIT` | 127-129 | `partials/theme-init.html` | Theme loader script |
| `SCRIPTS_SHARED` | 350-369 | `partials/scripts-shared.html` | Import map + 4 module scripts |

---

## 3. Forms & Inputs

### Step 1: Data Diri (lines 171-242)

| ID | Label | Type | Line | Notes |
|----|-------|------|------|-------|
| `job` | Nomer Job ASJ | text (hidden) | 176 | `readonly`, auto-filled from URL |
| `bidang` | Bidang Pekerjaan | text (hidden) | 182 | `readonly`, auto-filled from URL |
| `wa` | Nomor WhatsApp | tel | 190 | `onblur`: formatInputWA + cekRiwayat |
| `nama` | Nama Lengkap | text | 200 | Auto-kapital, placeholder "Sesuai KTP/Paspor" |
| `email` | Alamat Email Aktif | email | 208 | |
| `gender` | Gender | select | 216 | Options: LAKI-LAKI / PEREMPUAN |
| `usia` | Usia | number | 224 | inputmode="numeric" |
| `tb` | Tinggi Badan | number | 232 | placeholder "cm" |
| `bb` | Berat Badan | number | 238 | placeholder "kg" |

### Step 2: Upload Dokumen (lines 244-305)

| ID | Label | Accept | Max | Line | Default |
|----|-------|--------|-----|------|---------|
| `photo` | Pas Photo | .jpg,.jpeg,.png | 2MB | 255 | Visible |
| `cv` | CV ASJ | .pdf,.xls,.xlsx,.doc/.docx | 2MB | 270 | Hidden |
| `jft` | JFT Certificate | .pdf | 2MB | 284 | Hidden |
| `ssw` | SSW Certificate | .pdf | 2MB | 298 | Hidden |
| dynamic | Via `#dynamic-cards` | .pdf,image/* | 2MB | 304 | JS-generated |

**Visibility logic:** `applyDocsPlan(reqStr)` parses `req` URL param (default `"CV,JFT,SSW"`) to show/hide cards. Non-standard items go to `#dynamic-cards`.

### Step 3: Konfirmasi (lines 307-318)

| ID | Type | Line | Purpose |
|----|------|------|---------|
| `agree` | checkbox | 310 | Declaration — required for submit |

**Validation:** No HTML5 `required` attributes. All validation via JS module.

---

## 4. Inline Event Handlers

### onclick (8 handlers)

| Line | Element | Handler |
|------|---------|---------|
| 253 | Photo upload button | `photo.click()` |
| 268 | CV upload button | `cv.click()` |
| 282 | JFT upload button | `jft.click()` |
| 296 | SSW upload button | `ssw.click()` |
| 325 | #btnPrev | `changeStep(-1)` |
| 326 | #btnNext | `changeStep(1)` |
| 327 | #btnSubmit | `submitApply()` |
| 343 | Success return button | `window.top.location.href='/index.html'` |

### onblur (1 handler)

| Line | Element | Handler |
|------|---------|---------|
| 190 | #wa | `formatInputWA(this); cekRiwayat();` |

---

## 5. Step Flow

```
Step 1 (Data Diri)  →[Lanjut]→  Step 2 (Dokumen)  →[Lanjut]→  Step 3 (Kirim)
                         ↑                                    │
                         └──────────[Kembali]─────────────────┘
```

- `f` = current step (JS variable, init 1)
- `.step-content` toggled via `.active` class
- `#btnPrev` hidden on step 1
- `#btnNext` hidden on step 3
- `#btnSubmit` shown only on step 3
- `#progress-line` width transitions between steps

---

## 6. i18n

**0 `data-lang` attributes.** All UI text hardcoded in Bahasa Indonesia. No i18n support.

---

## 7. External Resources

### Images

| Line | URL | Purpose |
|------|-----|---------|
| 140 | `images.unsplash.com/photo-1493976040374-85c8e12f0c0e` | Hero background |
| 143 | `gdwvffmevwtwnzrapjwy.supabase.co/.../logo_apply.png` | Logo |

### CSS/JS

| File | Purpose |
|------|---------|
| `/vendor/font-awesome/css/all.min.css` | Icons |
| `/fonts/fonts.css` | Custom fonts |
| `/assets/main.css` | Tailwind utilities |
| `<style>` inline (200 lines) | Custom page CSS |
| `/js/pages/apply_full.js` | Main logic |
| `/js/apply-docs.js` | Document plan |
| `/js/upload-guard.js` | File validation |
| `/pwa.js` | SW registration |

---

## 8. CSS Approach

- **Hybrid:** 200 lines inline `<style>` + Tailwind utilities from `main.css`
- **Dark theme:** `#020617` bg, `#ec4899` pink accent, glassmorphism
- **Animations:** `fadeIn` (step transitions), `spin` (loading spinner)
- **Inline styles** on lines 334, 340 (should be classes)

---

## 9. URL Parameters

| Param | Default | Field | Purpose |
|-------|---------|-------|---------|
| `job` | `""` | `#job` | Job code |
| `bidang` | `""` | `#bidang` | Job category |
| `wa` | `""` | `#wa` | WhatsApp (auto-normalized to 628xx) |
| `nama` | `""` | `#nama` | Applicant name |
| `req` | `"CV,JFT,SSW"` | `window.dynamicReqStr` | Required documents |

**Example:** `apply-full.html?job=JOB-001&bidang=Pertanian&wa=08123456789&nama=Budi&req=CV,JFT,SSW,KTP`

---

## 10. JavaScript

### Module Chain
```
apply_full.js  →  js/core/bridge.js (registerSeamAliases)
apply-docs.js  →  js/core/bridge.js
upload-guard.js →  js/core/bridge.js
```

### Key Functions (exported via seam aliases)

| Function | Purpose | Called From |
|----------|---------|------------|
| `formatInputWA(el)` | Normalize WA format (add 62 prefix) | `onblur` #wa |
| `cekRiwayat()` | Check prev application, auto-fill | `onblur` #wa |
| `changeStep(delta)` | Navigate wizard ±1 | btnPrev/btnNext |
| `submitApply()` | Submit form + files via API | btnSubmit |
| `handleExtraFile(input, idx)` | Handle dynamic file uploads | Dynamic onchange |

### Internal Functions

| Function | Purpose |
|----------|---------|
| `escapeHtml(str)` | XSS-safe escaping |
| `openDB/readDraft/writeDraft/deleteDraft` | IndexedDB draft persistence |
| `saveDraft()/restoreDraft()` | Draft save/restore |
| `applyDocsPlan(reqStr)` | Show/hide upload cards |

---

## 11. Accessibility

### ARIA (18 attributes)

- All form inputs have `aria-label` + visible `<label>` (good redundancy)
- `#wa-msg`, `#wa-warn`, toast container have `aria-live="polite"`
- Back-to-portal link has `aria-label="Kembali ke Portal"`
- `<main>` has `tabindex="-1"` (skip link target)

### Missing

- No `role="progressbar"` on stepper
- No `aria-describedby` linking tip text to inputs
- No `role="dialog"` on loading/success modals
- No focus trapping in modals

---

## 12. Issues Found

### Structural

| # | Line | Issue | Severity |
|---|------|-------|----------|
| 1 | 1 | **Missing `<!DOCTYPE html>` and `<html lang>`** — file starts with `<head>` directly | 🔴 High |
| 2 | 321 | **Missing `</main>`** — `<main>` opened at 149, never explicitly closed | 🟡 Medium |
| 3 | 334,340 | **Inline `style=` attributes** — should be CSS classes | 🟢 Low |

### Semantic

| # | Line | Issue |
|---|------|-------|
| 1 | 153-169 | Stepper lacks `role="progressbar"` + `aria-valuenow` |
| 2 | 330,338 | Loading/success modals lack `role="dialog"` + `aria-modal` |
| 3 | 202 | Tip text not linked to input via `aria-describedby` |

### Accessibility

| # | Issue |
|---|-------|
| 1 | No `for` attribute on `<label>` elements (relies on DOM proximity) |
| 2 | No focus management on step change |
| 3 | No error announcement for validation failures |

---

## 13. Key Functions Referenced

`formatInputWA`, `cekRiwayat`, `changeStep`, `submitApply`, `handleExtraFile`, `photo.click()`, `cv.click()`, `jft.click()`, `ssw.click()`, `window.top.location.href`

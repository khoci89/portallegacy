# ai_form.html — Deep Analysis

> Deep scan: 2026-09-11. Standalone page (type="module") — AI-powered CV chat + bilingual preview form.
> Entry point: `js/pages/ai_form.ts` → `js/pages/ai_form.js`

## 1. Struktur HTML (388 baris)

```
ai_form.html (388 baris)
├── <!DOCTYPE html><html lang="id"> (1-2)
├── <head> (3-70)
│   ├── Meta, CSP (unsafe-inline + unsafe-eval), PWA manifest
│   ├── Favicon (Supabase CDN)
│   ├── <!--HEAD_SHARED_START--> (21-26): Font Awesome, fonts.css, Montserrat preload
│   ├── <style> (27-64): ~40 baris CSS (scrollbar, animations, form micro-styles, responsive)
│   └── /assets/main.css (69)
│
├── <body onload="initApp()" data-page="ai_form"> (71-386)
│   ├── <!--THEME_INIT_START--> (72-74): Theme loader
│   ├── Back-to-portal link (75-79): Fixed position
│   ├── Skip link (80-81): Targets #formPanel
│   ├── Mobile tab bar (83-86): Chat/Form tabs (md:hidden)
│   │
│   ├── #chatPanel (88-106): AI chat interface
│   │   ├── Header (89-98): Avatar "Qween Jeklin" + green pulse
│   │   ├── #chatBox (100): Messages container (aria-live="polite")
│   │   └── Input bar (102-105): #userInput + #sendBtn
│   │
│   ├── #formPanel (108-367): Bilingual CV preview form (hidden md:block)
│   │   ├── Header (111-121): Logo + "PREVIEW CV JEPANG" + SIMPAN DB + lang toggle
│   │   ├── #aiTypingStatus (123): Hidden AI status bar
│   │   │
│   │   ├── Section 1: Identitas & Kontak (125-148) — 20+ fields
│   │   │   ├── f_nama, f_katakana, f_panggilan, f_panggilan_katakana
│   │   │   ├── f_tmplahir, f_tgllahir (date), f_umur, f_gender, f_agama
│   │   │   ├── f_goldar, f_status, f_anak, f_email, f_alamat
│   │   │   ├── f_hp, f_hpdarurat, f_ktp
│   │   │   └── f_paspor_status (select), f_paspor, f_sim_status (select), f_sim
│   │   │
│   │   ├── Section 2: Fisik (150-161) — 7 fields
│   │   │   └── f_tb, f_bb, f_tangan, f_sepatu, f_baju, f_topi, f_tahan_ac
│   │   │
│   │   ├── Section 3: Medis (163-188) — 13 fields
│   │   │   ├── f_matakanan, f_matakiri, f_kacamata, f_butawarna
│   │   │   ├── f_tato, f_rokok, f_alkohol
│   │   │   └── Bilingual pairs: alergi_id/jp, medis_id/jp, laka_id/jp
│   │   │
│   │   ├── Section 4: Wawancara (190-215) — 24 fields
│   │   │   ├── f_riwayatjepang
│   │   │   └── Bilingual pairs: promo, lebih, kurang, hobi, keahlian,
│   │   │       moti, alasan, pulang, keinginan, tujuan (id/jp each)
│   │   │       + f_lama, f_gaji_yen, f_tabungan
│   │   │
│   │   ├── Section 5: Pendidikan/Cert (218-265)
│   │   │   ├── f_bhs_jepang (datalist: jft-options, 8 items)
│   │   │   ├── f_nilai, f_lisensi (datalist: ssw-options, 16 items)
│   │   │   ├── #c_pendidikan (dynamic, max 5)
│   │   │   ├── #c_pekerjaan (dynamic, max 3)
│   │   │   └── #c_keluarga (dynamic, max 5)
│   │   │
│   │   ├── Kenalan di Jepang (268-285) — 9 fields
│   │   │   └── f_kenalan_nama/hub/kerja/alamat (id/jp pairs) + f_kenalan_usia
│   │   │
│   │   └── Document Uploads (287-363) — 8 file inputs
│   │       ├── Photo (image/*) → compressImage()
│   │       ├── JFT (.pdf), SSW (.pdf)
│   │       ├── KTP (.pdf,image/*), KK (.pdf,image/*)
│   │       └── Ijazah SD/SMP/SMA/Univ (.pdf,image/*)
│   │
│   ├── <!--SCRIPTS_SHARED_START--> (369-385)
│   │   ├── Toast container, importmap
│   │   ├── /js/upload-guard.js
│   │   ├── /js/pages/ai_form.js (main logic)
│   │   └── /pwa.js
│   └── </body></html>
```

---

## 2. Partials (3 marker pairs)

| Marker | Lines | Partial File | Isi |
|--------|-------|-------------|-----|
| `HEAD_SHARED` | 21-26 | `partials/head-shared.html` | Font Awesome, fonts.css, Montserrat preload |
| `THEME_INIT` | 72-74 | `partials/theme-init.html` | Theme loader script |
| `SCRIPTS_SHARED` | 369-385 | `partials/scripts-shared.html` | Toast, importmap, module scripts |

---

## 3. AI Chat Section (lines 88-106)

**Header:** "Qween Jeklin" avatar (Supabase CDN), green pulse status indicator.

**Message flow:**
1. User types in `#userInput` → Enter or #sendBtn → `sendMessage()`
2. Messages appended to `#chatBox` (aria-live="polite")
3. AI responses rendered dynamically by JS

**Input:** `#userInput` (text, aria-label="Ketik pesan") + `#sendBtn` (disabled state via JS).

---

## 4. Bilingual Form Section (lines 108-367)

**All inputs are `readonly`** (66 instances). Form is display-only, not editable.

### Field Count

| Type | Count |
|------|-------|
| Text inputs (readonly) | 44 |
| Date inputs | 1 |
| Textarea (bilingual ID/JP pairs) | 18 |
| Select (readonly) | 2 |
| File inputs | 8 |
| Datalists | 3 |
| **Total** | **76** |

### Key Sections

- **Section 1 — Identitas & Kontak (20+ fields):** nama, katakana, panggilan, tmplahir, tgllahir, umur, gender, agama, goldar, status, anak, email, alamat, hp, hpdarurat, ktp, paspor, sim
- **Section 2 — Fisik (7):** tb, bb, tangan, sepatu, baju, topi, tahan_ac
- **Section 3 — Medis (13):** mata, kacamata, butawarna, tato, rokok, alergi (id/jp), medis (id/jp), laka (id/jp)
- **Section 4 — Wawancara (24):** 10 bilingual textarea pairs (promo, lebih, kurang, hobi, keahlian, moti, alasan, pulang, keinginan, tujuan) + lama, gaji_yen, tabungan
- **Section 5 — Pendidikan/Cert:** bhs_jepang (datalist), nilai, lisensi (datalist) + 3 dynamic containers
- **Kenalan di Jepang (9):** 4 bilingual pairs + usia
- **Uploads (8):** photo, jft, ssw, ktp, kk, ijazah SD/SMP/SMA, univ

### Datalists

| ID | Options |
|----|---------|
| `jft-options` | N1-N5, JFT BASIC A2, BELUM LULUS, BELUM TES |
| `ssw-options` | 16 SSW occupation categories |
| `pekerjaan-options` | 23 job types |

---

## 5. i18n

| Attribute | Count |
|-----------|-------|
| `data-lang` | 84 |
| `data-lang-placeholder` | 1 |
| `data-lang-aria` | 1 |
| **Total** | **86** |

- Namespace: `form.ai_*` (form-specific), `a11y.*`, `ui.*` (shared)
- Language toggle: button at line 120 calls `toggleFormLanguage(); updateFormUI();`

---

## 6. External Resources

### Images

| Line | URL | Purpose |
|------|-----|---------|
| 92 | `gdwvffmevwtwnzrapjwy.supabase.co/.../jeklin.png` | Chat avatar |
| 13-14 | `gdwvffmevwtwnzrapjwy.supabase.co/.../logo-removebg-preview.webp` | Favicon |

### CSS/JS

| File | Purpose |
|------|---------|
| `/vendor/font-awesome/css/all.min.css` | Icons |
| `/fonts/fonts.css` | Custom fonts |
| `/assets/main.css` | Tailwind bundle |
| `<style>` inline (40 lines) | Custom page CSS |
| `/js/pages/ai_form.js` | Main logic |
| `/js/upload-guard.js` | File validation |
| `/pwa.js` | SW registration |

---

## 7. CSS Approach

- **Hybrid:** 40 lines inline `<style>` + Tailwind from `main.css`
- **Dark theme:** `#020617` bg, glassmorphism
- **Responsive:** `@media (max-width: 767px)` for mobile panels (100dvh, safe-area padding)
- **Touch targets:** 44px min on mobile for chat input/button
- **3 inline `style=`** attributes (f_paspor_status width, f_sim_status width, body height)

---

## 8. JavaScript

### Entry Point
`/js/pages/ai_form.js` — ESM module, registers functions globally via `registerSeamAliases`

### URL Parameters

| Param | Variable | Purpose |
|-------|----------|---------|
| `flow` | `a` | Conversation flow |
| `job` | - | Job context |
| `bidang` | - | Field/specialization |
| `wa` | `t()` result | WhatsApp number (sanitized) |
| `nama` | - | Candidate name |

Exposed as `window.AI_FORM_CONTEXT = { flow, job, bidang, wa, nama }`.

### Key Functions (from HTML)

| Function | Called From | Purpose |
|----------|------------|---------|
| `initApp()` | body onload (71) | Page initialization |
| `switchTab('chat')` | #btnTabChat (84) | Show chat panel (mobile) |
| `switchTab('form')` | #btnTabForm (85) | Show form panel (mobile) |
| `handleEnter(event)` | #userInput onkeypress (103) | Send on Enter |
| `sendMessage()` | #sendBtn onclick (104) | Send chat message |
| `saveToDatabase()` | #btnSaveDB (119) | Submit to API |
| `toggleFormLanguage()` | Lang button (120) | Switch ID/JP labels |
| `updateFormUI()` | Lang button (120) | Refresh form display |
| `compressImage(event)` | Photo upload (292) | Client-side JPEG compress |
| `handleDocUpload(event, type)` | 7 doc uploads (301-360) | Handle file selection |

---

## 9. Accessibility

### Present

- 5 `aria-label` (portal link, tab buttons, userInput, sendBtn, btnSaveDB)
- 3 `aria-live="polite"` (chatBox, aiTypingStatus, toast-container)
- Skip link targeting #formPanel
- Touch targets 44px on mobile

### Missing

- **0 of 74 labels** have `for` attribute — WCAG 2.1 SC 1.3.1 failure
- No `role` attributes
- No `aria-describedby` for error/status messages
- No focus management on tab switch

---

## 10. Issues Found

### Critical

| # | Line | Issue |
|---|------|-------|
| 1 | 100 | **Broken class attribute** — `class="flex-1 overflow-y-auto"` closes early; `p-3 space-y-4 pb-24 md:pb-4` are bare attributes outside class. ChatBox will lack padding/spacing. |

### Structural

| # | Line | Issue |
|---|------|-------|
| 2 | 1 | **Missing `<!DOCTYPE html>` and `<html lang>`** — file starts with `<head>` directly |
| 3 | 71 | **`onload="initApp()"` with `type="module"`** — timing-dependent on registerSeamAliases |
| 4 | - | **All 66 inputs readonly** — form is display-only, contradicts "Edit manual aktif" label |
| 5 | - | **No `<form>` element** — all submission via JS |
| 6 | - | **0/74 labels have `for`** — broken programmatic association |
| 7 | 295 | **Photo preview `alt=""`** — meaningful image has empty alt |

### Accessibility

| # | Issue |
|---|-------|
| 1 | No `role="dialog"` on any modal |
| 2 | No focus trap in modals |
| 3 | No `aria-describedby` linking error messages to inputs |

---

## 11. Key Functions Referenced

`initApp`, `switchTab`, `handleEnter`, `sendMessage`, `saveToDatabase`, `toggleFormLanguage`, `updateFormUI`, `compressImage`, `handleDocUpload`

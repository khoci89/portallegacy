# master-full.html — Deep Analysis

> Deep scan: 2026-09-11. Standalone page (type="module") — 5-step master biodata form + login gate.
> Entry point: `js/pages/master_full.ts` → `js/pages/master_full.js`

## 1. Struktur HTML (379 baris)

```
master-full.html (379 baris)
├── <!DOCTYPE html><html lang="id"> (1-2)
├── <head> (3-66)
│   ├── Meta, CSP, PWA manifest
│   ├── <!--HEAD_SHARED_START--> (19-24): Font Awesome, fonts.css, Montserrat preload
│   ├── <style> (25-64): ~40 baris CSS kustom (hero, glass, stepper, forms)
│   └── /assets/main.css (65)
│
├── <body data-page="master-full"> (67)
│   ├── <!--THEME_INIT_START--> (68-70): Theme loader
│   ├── Back-to-portal link (72-75): Fixed position
│   ├── Skip link (77): WCAG 2.4.1
│   ├── Loading overlay (78-81)
│   ├── Hero banner (83-92): Background + logo + title + lang toggle
│   │
│   ├── <main id="main-content"> (94-331)
│   │   └── .glass card (95-330)
│   │       ├── Stepper (97-104): 5 indicators
│   │       │
│   │       ├── STEP 1: Identitas (107-157) — 32 fields
│   │       │   ├── #wa (hidden), #nama, #furigana, #panggilan, #panggilanKatakana
│   │       │   ├── #tempatLahir, #tglLahir (date), #usia (number)
│   │       │   ├── #gender (select), #agama (select), #statusNikah (select)
│   │       │   ├── #anak (number), #ktp (number), #sim
│   │       │   ├── #alamat (textarea), #email
│   │       │   ├── #tb, #bb, #baju, #sepatu, #topi
│   │       │   └── #goldar, #tangan, #tahanAc (selects)
│   │       │
│   │       ├── STEP 2: Medis & Wawancara (160-196) — 18 fields
│   │       │   ├── #mataKiri, #mataKanan, #kacamata, #butaWarna (selects)
│   │       │   ├── #tato, #tindik, #merokok, #alkohol (selects)
│   │       │   ├── #penyakit, #alergi, #laka (textareas)
│   │       │   ├── #promosi (textarea), #kelebihan, #kekurangan
│   │       │   ├── #keahlianKhusus, #hobi
│   │       │   ├── #alasanBidang, #motivasiJepang, #keinginan, #rencanaPulang (textareas)
│   │       │   └── #tujuanJepang, #lamaJepang, #gajiYen, #tabungan
│   │       │
│   │       ├── STEP 3: Riwayat (199-204) — Dynamic containers
│   │       │   ├── #edu-container (max 5 education entries)
│   │       │   └── #job-container (max 3 work entries)
│   │       │
│   │       ├── STEP 4: Keluarga & Kontak (207-232)
│   │       │   ├── #fam-container (max 5 family entries)
│   │       │   ├── Emergency: #daruratNama, #daruratHubungan, #daruratWa
│   │       │   └── Japan: #kenalanNama, #kenalanUsia, #kenalanHubungan, #kenalanPekerjaan, #kenalanAlamat
│   │       │
│   │       └── STEP 5: Dokumen (235-328) — 9 file uploads
│   │           ├── #noCoe, #noPaspor, #tglTerbitPaspor, #expPaspor, #kotaPaspor
│   │           ├── #eksJepang (select), #bhsJepang (select)
│   │           ├── #nilai, #lisensi (select), #lisensi2 (select)
│   │           ├── #photo (.jpg/.jpeg/.png)
│   │           ├── #jft (.pdf), #ssw (.pdf)
│   │           ├── #ijazahSd, #ijazahSmp, #ijazahSma (.pdf,image/*)
│   │           ├── #univ (.pdf,image/*)
│   │           └── #ktpFile, #kk (.pdf,image/*)
│   │
│   ├── Sticky bottom nav (333-339): btnPrev, Draft, unsaved-badge, btnNext, btnSubmit
│   │
│   ├── Login gate (341-356): Password overlay
│   │   ├── #gate-wa: Display WA number
│   │   ├── #gate-pass: Password input
│   │   ├── #gate-btn: Masuk button
│   │   └── #gate-msg: Error message
│   │
│   └── <!--SCRIPTS_SHARED_START--> (360-377)
│       ├── Toast container, importmap
│       ├── /js/upload-guard.js
│       ├── /js/pages/master_full.js (main logic)
│       └── /pwa.js
```

---

## 2. Partials (3 marker pairs)

| Marker | Lines | Partial File | Isi |
|--------|-------|-------------|-----|
| `HEAD_SHARED` | 19-24 | `partials/head-shared.html` | Font Awesome, fonts.css, Montserrat preload |
| `THEME_INIT` | 68-70 | `partials/theme-init.html` | Theme loader script |
| `SCRIPTS_SHARED` | 360-377 | `partials/scripts-shared.html` | Toast, importmap, module scripts |

---

## 3. Login Gate (lines 341-356)

Full-screen overlay (`#login-gate`) — hidden by default, z-50 bg-black/85.

**Flow:**
1. WA number from URL/QR displayed in `#gate-wa`
2. User enters password in `#gate-pass`
3. Enter key or "Masuk" button → `gateLogin()`
4. Error shown in `#gate-msg`
5. Success → hides gate, shows form

**Security:** WA alone is not sufficient; password + server session required.

---

## 4. Forms & Inputs

**No `<form>` element.** All fields managed by JS via DOM `id`.

### Field Count

| Type | Count |
|------|-------|
| Text inputs | ~35 |
| Number inputs | ~10 |
| Date inputs | 4 |
| Email inputs | 1 |
| Select elements | 16 |
| Textarea elements | 9 |
| File inputs | 9 |
| Hidden inputs | 3 (wa, lisensi_manual, lisensi2_manual) |
| Password (gate) | 1 |
| **Total** | **~88** |

### Key Fields by Step

**Step 1 — Identitas (32 fields):**
nama, furigana, panggilan, tempatLahir, tglLahir, usia, gender, agama, statusNikah, anak, ktp (NIK), sim, alamat, email, tb, bb, baju, sepatu, topi, goldar, tangan, tahanAc

**Step 2 — Medis & Wawancara (18 fields):**
mataKiri, mataKanan, kacamata, butaWarna, tato, tindik, merokok, alkohol, penyakit, alergi, laka, promosi, kelebihan, kekurangan, keahlianKhusus, hobi, alasanBidang, motivasiJepang, keinginan, rencanaPulang, tujuanJepang, lamaJepang, gajiYen, tabungan

**Step 3 — Riwayat (dynamic):**
edu-container (max 5), job-container (max 3)

**Step 4 — Keluarga & Kontak:**
fam-container (max 5), daruratNama, daruratHubungan, daruratWa, kenalanNama, kenalanUsia, kenalanHubungan, kenalanPekerjaan, kenalanAlamat

**Step 5 — Dokumen (9 uploads + 6 fields):**
noCoe, noPaspor, tglTerbitPaspor, expPaspor, kotaPaspor, eksJepang, bhsJepang, nilai, lisensi, lisensi2, photo, jft, ssw, ijazahSd/Smp/Sma, univ, ktpFile, kk

---

## 5. Step Flow

```
Login Gate → Step 1 (Identitas) → Step 2 (Medis) → Step 3 (Riwayat) → Step 4 (Keluarga) → Step 5 (Dokumen) → Submit
                ↑                                              │
                └────────────────[Kembali]─────────────────────┘
```

- `f` = current step (JS variable)
- Stepper indicators: `#ind-1` to `#ind-5`
- `.step.active` = blue highlight, `.step.completed` = darker blue
- `#btnPrev` hidden on step 1
- `#btnSubmit` hidden until step 5
- Draft button always visible
- `#unsaved-badge` pulses when changes detected

---

## 6. i18n

| Metric | Count |
|--------|-------|
| `data-lang` | 124 |
| `data-lang-placeholder` | 33 |
| **Total** | **157** |

- Namespace: `form.mf_*` (90 keys), `candidate.*` (10 keys)
- Language toggle: button at line 91 calls `toggleFormLanguage()`
- Selector options also translated (gender, religion, etc.)

---

## 7. External Resources

### Images

| Line | URL | Purpose |
|------|-----|---------|
| 84 | `images.unsplash.com/photo-1493976040374-85c8e12f0c0e` | Hero background |
| 87 | `/assets/logo.png?v=5d2cdd9479` | ASJ logo |

### CSS/JS

| File | Purpose |
|------|---------|
| `/vendor/font-awesome/css/all.min.css` | Icons |
| `/fonts/fonts.css` | Custom fonts |
| `/assets/main.css` | Tailwind bundle |
| `<style>` inline (40 lines) | Custom page CSS |
| `/js/pages/master_full.js` | Main logic |
| `/js/upload-guard.js` | File validation |
| `/pwa.js` | SW registration |

---

## 8. CSS Approach

- **Hybrid:** 40 lines inline `<style>` + Tailwind from `main.css`
- **Dark theme:** `#020617` bg, `#38bdf8` sky-blue accent, glassmorphism
- **Only 1 inline `style=`** on `#btnPrev` (display:none)
- Custom tokens in CSS (`#38bdf8`, `#020617`) vs Tailwind (`sky-500`, `slate-950`)

---

## 9. JavaScript

### Entry Point
`/js/pages/master_full.js` — ESM module, imports via `bridge.js` (i18n + api-client)

### Script Tags

| Line | Source | Purpose |
|------|--------|---------|
| 69 | Inline | Theme init |
| 366-372 | importmap | Maps `@sentry/browser` to dummy |
| 373 | `/js/upload-guard.js` | File validation |
| 375 | `/js/pages/master_full.js` | Main logic |
| 376 | `/pwa.js` | SW registration |

### Key Functions (from HTML)

| Function | Called From | Purpose |
|----------|------------|---------|
| `toggleFormLanguage()` | Line 91 (onclick) | Switch ID/JP labels |
| `changeStep(-1)` | Line 334 (btnPrev) | Previous step |
| `changeStep(1)` | Line 337 (btnNext) | Next step |
| `submitMaster(true)` | Line 336 (Draft) | Save draft |
| `submitMaster(false)` | Line 338 (btnSubmit) | Final submit |
| `gateLogin()` | Line 352 (Enter) + 353 (btn) | Authenticate |
| `handleFile(this, 'XxxInfo')` | 9 file inputs (onchange) | Process file selection |
| `onSswSelect('lisensi')` | Line 252 (onchange) | SSW 1 select handler |
| `onSswSelect('lisensi2')` | Line 253 (onchange) | SSW 2 select handler |

---

## 10. URL Parameters

Not read in HTML — handled by `master_full.js`. Likely: `?wa=628xxx` (from QR code).

---

## 11. Accessibility

### Present

- 7 `aria-label` attributes (portal link, wa, nama, furigana, tglLahir, gender, alamat, email, btnPrev, btnNext, gate-pass)
- 11 `aria-live="polite"` (loading, 9 file info divs, toast)
- 66 `<label>` elements
- Skip link present
- `<main tabindex="-1">` for skip target

### Missing

- Only **1 of 66 labels** has `for` attribute (gate-pass)
- No `role` attributes anywhere
- No `aria-describedby` for error messages
- No `aria-required` on mandatory fields
- No `<fieldset>` / `<legend>` for grouping
- No focus management on step change

---

## 12. Issues Found

### Structural

| # | Severity | Issue | Line |
|---|----------|-------|------|
| 1 | 🟡 Medium | **No `<form>` element** — all validation/submission via JS | Global |
| 2 | 🟡 Medium | **`ktp` (NIK) uses `type="number"`** — 16-digit ID may truncate/allow decimals | 134 |
| 3 | 🟡 Medium | **`daruratWa` uses `type="number"`** — WA numbers should be text | 216 |
| 4 | 🟢 Low | **Only 1/66 labels has `for`** — breaks programmatic association | Multiple |
| 5 | 🟢 Low | **27 inline `onclick` handlers** — could use addEventListener | Multiple |
| 6 | 🟢 Low | **`lisensi`/`lisensi2` empty selects** — populated by JS | 252-253 |

### Pre-existing

1. **Div imbalance: 175 open / 176 close** — was already present before our changes.
2. **Missing `</main>`** — opened at line 94, not explicitly closed.

---

## 13. Key Functions Referenced

`toggleFormLanguage`, `changeStep`, `submitMaster`, `gateLogin`, `handleFile`, `onSswSelect`, `showToast`

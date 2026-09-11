# siswa-baru.html — Deep Analysis

> Deep scan: 2026-09-11. Standalone page (type="module") — AI chat + student registration.
> Entry point: `js/pages/siswa_baru.ts` → `js/pages/siswa_baru.js`

## 1. Struktur HTML (170 baris)

```
siswa-baru.html (170 baris)
├── <!DOCTYPE html><html lang="id"> (1-2)
├── <head> (3-40)
│   ├── Meta, CSP, PWA manifest, theme-color
│   ├── <!--HEAD_SHARED_START--> (21-26): Font Awesome, fonts.css, Montserrat preload
│   ├── <style> (27-39): ~13 baris CSS (scrollbar, fadeIn, responsive)
│   └── /assets/main.css (40)
│
├── <body onload="initApp()" data-page="siswa-baru"> (41)
│   ├── <!--THEME_INIT_START--> (42-44): Theme loader
│   ├── Back-to-portal link (46-49): Fixed position
│   ├── Skip link (52): Targets #formPanel
│   ├── Mobile tab bar (55-59): Chat/Form tabs (md:hidden)
│   │
│   ├── #chatPanel (62-80): AI chat interface
│   │   ├── Header (63-72): Avatar "Qween Jeklin" + green pulse
│   │   ├── #chatBox (74): Messages container (aria-live="polite")
│   │   └── Input bar (76-79): #userInput + #sendBtn
│   │
│   ├── <main id="formPanel"> (83-145): Student registration form
│   │   ├── Header (86-95): Logo + "FORM SISWA BARU ASJ" + SUBMIT
│   │   ├── #aiTypingStatus (97): Hidden AI typing indicator
│   │   │
│   │   ├── Biodata Section (99-114): 2-column grid, 9 fields
│   │   │   ├── f_nama (full width)
│   │   │   ├── f_ttl, f_gender, f_agama, f_email
│   │   │   ├── f_alamat (full width)
│   │   │   ├── f_pendidikan (full width)
│   │   │   └── f_wa_siswa, f_wa_ortu
│   │   │
│   │   └── Document Uploads (116-142): 3-column grid
│   │       ├── KTP (.pdf,image/*) → handleDocUpload(event, 'ktp')
│   │       ├── KK (.pdf,image/*) → handleDocUpload(event, 'kk')
│   │       └── IJAZAH (.pdf,image/*) → handleDocUpload(event, 'ijazah')
│   │
│   ├── <!--SCRIPTS_SHARED_START--> (149-166)
│   │   ├── Toast container
│   │   ├── importmap (@sentry/browser → dummy)
│   │   ├── /js/upload-guard.js
│   │   ├── /js/pages/siswa_baru.js
│   │   └── /pwa.js
│   └── </body></html>
```

---

## 2. Partials (3 marker pairs)

| Marker | Lines | Partial File | Isi |
|--------|-------|-------------|-----|
| `HEAD_SHARED` | 21-26 | `partials/head-shared.html` | Font Awesome, fonts.css, Montserrat preload |
| `THEME_INIT` | 42-44 | `partials/theme-init.html` | Theme loader script |
| `SCRIPTS_SHARED` | 149-166 | `partials/scripts-shared.html` | Toast, importmap, module scripts |

---

## 3. AI Chat Section (lines 62-80)

Same pattern as ai_form.html:
- Header: Jeklin avatar (Supabase CDN) + green pulse
- `#chatBox`: Messages container
- `#userInput` + `#sendBtn`

**Flow:**
1. `initApp()` checks IndexedDB for draft (`asj_siswa_draft_v1`)
2. If found → restore chat + form; else → `sendWelcomeMessage()`
3. User types → Enter/click → `sendMessage()` → `callAPI('processSiswaAIChat', payload)`
4. API returns `{ reply, data }` → reply appended to chat, data auto-fills form
5. Auto-save to IndexedDB every 30 seconds

---

## 4. Student Registration Form (lines 83-145)

**All inputs start `readonly`** — removed at runtime by `initApp()`.

### Fields (9)

| ID | Label | Line | Notes |
|----|-------|------|-------|
| `f_nama` | NAMA LENGKAP | 104 | Full width |
| `f_ttl` | TEMPAT, TANGGAL LAHIR | 105 | |
| `f_gender` | GENDER | 106 | |
| `f_agama` | AGAMA | 107 | |
| `f_email` | EMAIL | 108 | |
| `f_alamat` | ALAMAT LENGKAP | 109 | Full width |
| `f_pendidikan` | PENDIDIKAN TERAKHIR | 110 | Full width |
| `f_wa_siswa` | NO. WA SISWA | 111 | |
| `f_wa_ortu` | NO. WA ORTU / WALI | 112 | |

### File Uploads (3)

| Accept | Handler | Status ID | Line |
|--------|---------|-----------|------|
| `.pdf,image/*` | `handleDocUpload(event, 'ktp')` | `#status_ktp` | 122 |
| `.pdf,image/*` | `handleDocUpload(event, 'kk')` | `#status_kk` | 130 |
| `.pdf,image/*` | `handleDocUpload(event, 'ijazah')` | `#status_ijazah` | 138 |

---

## 5. i18n

| Attribute | Count |
|-----------|-------|
| `data-lang` | 0 |
| `data-lang-aria` | 1 (vestigial) |
| **Total** | **1** |

All UI hardcoded in Bahasa Indonesia. JS uses `window.tr()` for some messages (e.g., `form.siswa_welcome`) but served by shared i18n, not HTML attrs.

---

## 6. External Resources

### Images

| Line | URL | Purpose |
|------|-----|---------|
| 66 | `gdwvffmevwtwnzrapjwy.supabase.co/.../jeklin.png` | Chat avatar |
| 88 | `gdwvffmevwtwnzrapjwy.supabase.co/.../logo_asj.png` | ASJ logo |

### CSS/JS

| File | Purpose |
|------|---------|
| `/vendor/font-awesome/css/all.min.css` | Icons |
| `/fonts/fonts.css` | Custom fonts |
| `/assets/main.css` | Tailwind bundle |
| `<style>` inline (13 lines) | Custom page CSS |
| `/js/pages/siswa_baru.js` | Main logic |
| `/js/upload-guard.js` | File validation |
| `/pwa.js` | SW registration |

---

## 7. CSS Approach

- **Minimal inline CSS:** 13 lines (scrollbar, fadeIn animation, responsive mobile overrides)
- **Tailwind:** Extensive utility classes throughout
- **Responsive:** `@media (max-width: 767px)` for chatPanel/formPanel/sendBtn

---

## 8. JavaScript

### Entry Point
`body onload="initApp()"` → `siswa_baru.js` → `registerSeamAliases`

### URL Parameters
**None.** Unlike sibling pages, siswa-baru reads no URL params.

### Key Functions (from HTML)

| Function | Called From | Purpose |
|----------|------------|---------|
| `initApp()` | body onload (41) | Restore drafts, bind listeners, render welcome |
| `switchTab('chat')` | #btnTabChat (57) | Show chat panel (mobile) |
| `switchTab('form')` | #btnTabForm (58) | Show form panel (mobile) |
| `handleEnter(event)` | #userInput onkeypress (77) | Send on Enter |
| `sendMessage()` | #sendBtn onclick (78) | Send chat message to AI API |
| `handleDocUpload(event, type)` | 3 file inputs (122,130,138) | Handle file selection |
| `saveToDatabase()` | #btnSaveDB (94) | Validate + upload + submit |

### IndexedDB Keys
- `asj_siswa_draft_v1` — chat history + form data + files

---

## 9. Accessibility

### Present

- 12 `aria-label` (portal link, tab buttons, sendBtn, formPanel, 9 form inputs)
- 4 `aria-live="polite"` (3 file status divs, toast container)
- Skip link targeting #formPanel
- All form inputs have visible `<label>` + `aria-label`

### Missing

- No `for` attribute on labels
- No `role` attributes
- No `aria-describedby` for error messages
- No `<noscript>` fallback (page depends entirely on JS)

---

## 10. Issues Found

| # | Severity | Issue | Line |
|---|----------|-------|------|
| 1 | 🟡 Medium | **No `<form>` element** — all submission via JS | Global |
| 2 | 🟢 Low | **Vestigial `data-lang-aria`** — 1 attr on sendBtn, no processor on this page | 78 |
| 3 | 🟢 Low | **All biodata inputs start `readonly`** — if JS fails, form non-functional | 104-112 |
| 4 | 🟢 Low | **No `<noscript>` fallback** | - |
| 5 | 🟢 Low | **Chat panel potential keyboard trap** on mobile | 62-80 |

### Passes

- ✅ Valid HTML5 structure (DOCTYPE, `<html lang>`, head, body)
- ✅ No duplicate IDs
- ✅ All tags properly closed
- ✅ Clean HTML (170 lines, simplest of all pages)

---

## 11. Key Functions Referenced

`initApp`, `switchTab`, `handleEnter`, `sendMessage`, `handleDocUpload`, `saveToDatabase`

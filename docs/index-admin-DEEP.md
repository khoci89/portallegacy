# index.html — Deep Analysis

> Deep scan: 2026-09-11. Bundle pages: index.html + admin.html.
> Untuk perbedaan具体 index vs admin, lihat bagian #2.

## 1. Struktur HTML (index.html — 1219 baris)

```
index.html
├── <!--HEAD_START--> (1-44)
│   ├── <!DOCTYPE html><html lang="id">
│   ├── <head>: meta, PWA manifest, CSS (font-awesome, fonts.css, main.css)
│   └── <body>: bg-slate-950, skip-link, sakura particles, global-loader
│
├── <!--HEADER_START--> (58-129)
│   ├── #asj-header: banner bg image + overlay + logo + tagline
│   ├── #nav-mode (belum login): Install App, Language, Login, Daftar, Admin
│   ├── #nav-admin-mode: Bell, AI HR, Publik, Admin, Keluar
│   └── #nav-kandidat-mode: Bell, Nama, Dashboard, Keluar
│
├── <!--PUBLIC_LANDING_START--> (180-402)
│   ├── Tab bar: Loker | Program & Layanan
│   ├── Public loker: filter bar (ALL/OPEN/URGENT/CLOSE) + table
│   ├── 3 service cards:
│   │   ├── Card 1: Siswa Baru (sakra_banner.webp) — bukaFormSiswa
│   │   ├── Card 2: Visa & Employment (dark_tokyo_banner.webp) — WhatsApp link
│   │   └── Card 3: Ujian & Sertifikasi (momiji_banner.webp) — Google Maps
│   └── Maps banner: link ke Google Maps
│
├── PAGE ADMIN (404-833) — hidden by default
│   ├── Dashboard: agenda harian + papan tugas tim
│   ├── Sidebar (drawer): 8 tabs
│   │   ├── Kelola Loker: table + search + edit
│   │   ├── DB Job Internal: table + sort + filter
│   │   ├── Tambah Loker: form (14 fields + checkboxes)
│   │   ├── Data Pelamar: table + filter + export CSV + bulk invite
│   │   ├── Jadwal Agenda: table + form
│   │   ├── Mail Inbox: table + filter status + bulk operations
│   │   ├── WA Pintar: template editor + list
│   │   └── Pengaturan: config + migration + pengumuman
│   └── Bottom section: WA group modals, migration, config
│
├── <!--KANDIDAT_DASHBOARD_START--> (836-988)
│   ├── Welcome + job applied + tahapan
│   ├── Digital Student Card (VIP): 3D card with QR code
│   ├── CV Progress bars: mini (0-100%) + master (0-100%)
│   ├── Schedule panel (jadwal)
│   ├── Multi-job progress view
│   ├── Admin evaluation notes
│   ├── Update profile grid: 8 action buttons
│   │   ├── CV Mini, Interview Simulator, E-Sign
│   │   ├── AI CV Master, Form Master Lengkap, Preview CV
│   │   └── Ganti Password
│   ├── Revision upload area (file-revisi)
│   └── Pemberkasan/berkas progress: 17 document checklist
│
├── <!--FOOTER_START--> (991-1010)
│   └── Social links (WA, IG, TikTok, Maps) + copyright
│
├── <!--BOTTOM_NAV_START--> (1076-1130)
│   ├── Admin bottom bar: Beranda, Kelola, Pelamar, Inbox, Config
│   └── Kandidat bottom bar: Lowongan, Profil, E-Sign
│
├── Modals (inline): pamfletModal (1056-1061)
├── Datalists: list-kode-job, list-lokasi, list-syarat (1038-1040)
│
├── <!--SHARED_MODALS_START--> (1180-1216)
│   └── XHR load /assets/modals-shared.html → inject ke #modal-root
│
└── Scripts: qrcode-generator.min.js, anti-cache, app-*.js bundle
```

---

## 2. index.html vs admin.html

| Aspek | index.html | admin.html |
|-------|-----------|------------|
| Lines | 1219 | 1024 |
| Flag | — | `window.IS_ADMIN_PORTAL = true` |
| Bundle | `app-e1672c281c.js` | `app-e1672c281c.js` (sama) |
| Default view | page-public | page-public (sama) |
| page-public | ✅ (job board + layanan) | ❌ tidak ada |
| page-kandidat | ✅ (dashboard + student card) | ❌ tidak ada |
| Public tab bar | ✅ | ❌ |
| Marquee pengumuman | ✅ visible | ✅ config only |
| Mobile nav: logged-out | ✅ | ❌ |
| Mobile nav: kandidat | ✅ | ❌ |
| Admin dashboard | ✅ | ✅ (identical) |
| Shared partials | 7 marker pairs | 7 marker pairs (sama) |

**Kesimpulan:** index.html = SPA lengkap (public + admin + kandidat). admin.html = admin-only entry point. Keduanya share **bundle JS yang sama** dan **7 partial pairs yang sama**.

---

## 3. Partials (7 marker pairs)

| Marker | Lines | Partial File | Isi |
|--------|-------|-------------|-----|
| `HEAD` | 1-44 | `partials/head.html` | `<head>` + open `<body>`, meta, CSS, PWA |
| `HEADER` | 58-129 | `partials/header.html` | Banner, nav modes (3 states), hamburger |
| `PUBLIC_LANDING` | 180-402 | `partials/public-landing.html` | Job board + 3 service cards + maps |
| `KANDIDAT_DASHBOARD` | 836-988 | `partials/kandidat-dashboard.html` | Student card, CV progress, actions |
| `FOOTER` | 991-1010 | `partials/footer.html` | Social links, copyright |
| `BOTTOM_NAV` | 1076-1130 | `partials/bottom-nav.html` | Mobile bottom bars (admin + kandidat) |
| `SHARED_MODALS` | 1180-1216 | XHR loader | Load modals-shared.html → #modal-root |

---

## 4. Inline Event Handlers

### onclick (30 handlers)

| Line | Target | Handler |
|------|--------|---------|
| 55 | force-close loader | `document.getElementById('global-loader').style.display='none'` |
| 87 | language toggle | `setLanguage(CURRENT_LANG === 'id' ? 'jp' : 'id')` |
| 103 | mail shortcut | `adminSwitchTab('mail'); changePage('admin')` |
| 116 | kandidat shortcut | `changePage('kandidat'); scrollIntoView(...)` |
| 141 | mobile: install | `toggleMobileMenu(); cobaInstallApp()` |
| 144 | mobile: language | `toggleFormLanguage()` |
| 149-151 | mobile: login/register/admin | `toggleMobileMenu(); bukaModalKandidat/showLoginAdminMaster` |
| 154-157 | mobile: admin nav | `changePage('admin')/changePage('public')/bukaAdminAiCopilot/logoutApp` |
| 160-162 | mobile: kandidat nav | `changePage('kandidat')/changePage('public')/logoutApp` |
| 439,443,460 | sidebar toggle | `window.toggleAdminSidebar()` |
| 667 | toggle jadwal form | `classList.toggle('hidden')` |
| 705-709 | mail filter | `mailFilterStatus=...; renderMailFilterUI(); renderFormInbox()` |
| 722 | mail select-all | `mailSelectAll(this)` |
| 925 | view digital CV | `bukaDigitalCV(currentKandidatId)` |
| 979 | pemberkasan | `bukaModalPemberkasan(currentKandidatWa)` |
| 1080 | bottom nav sidebar | `window.toggleAdminSidebar()` |
| 1118 | bottom nav kandidat | `changePage('kandidat'); window.scrollTo(0,0)` |

### onsubmit (3 forms)

| Line | Form ID | Handler |
|------|---------|---------|
| 529 | `form-tambah-job` | `submitFormAdmin(event)` |
| 671 | `form-tambah-jadwal` | `submitJadwal(event)` |
| 758 | `form-wa-template` | `submitWaTemplate(event)` |

### Other inline handlers

| Line | Type | Code |
|------|------|------|
| 64 | `onerror` | Logo fallback hide |
| 439 | `onkeydown` | Sidebar keyboard toggle |
| 470,494,548,557,612 | `onkeyup` | Search/filter functions |
| 540,541,957 | `onchange` | `cekUploadFile(this, {maxMb})` |
| 703 | `oninput` | `mailSearchText=this.value; renderFormInbox()` |

### data-action delegated (68 actions)

Action系统的概述 — full list di bridge.ts `dispatchSeamAction()`.

---

## 5. Forms

### form-tambah-job (line 529) — Admin job creation

| Field | Type | Notes |
|-------|------|-------|
| `input-tsk` | select | TSK PENGURUS |
| `input-tahapan-db` | select | TAHAPAN INTERNAL |
| `input-kuota` | text | KUOTA DIBUTUHKAN |
| `input-kategori` | select | KATEGORI BIDANG |
| `input-pekerjaan` | text | NAMA PEKERJAAN |
| `input-gender` | select | GENDER |
| `input-template` | file | CV/Excel (.pdf/.xls/.xlsx/.doc/.docx) |
| `input-pamflet` | file | Image (image/*) |
| `checkbox-lokasi` | dynamic cb | PENEMPATAN LOKASI |
| `custom-lokasi` | text | Custom location |
| `checkbox-syarat` | dynamic cb | SYARAT KANDIDAT |
| `custom-syarat` | text | Custom requirement |
| `checkbox-req-files` | 13 cb | Dokumen requirements |
| `custom-req-file` | text | Custom document |
| `input-keterangan` | textarea | KETERANGAN PUBLIK |
| `input-total-biaya` | text | TOTAL BIAYA JOB |
| `input-rincian-biaya` | hidden | Cost breakdown JSON |

### form-tambah-jadwal (line 671)

Fields: j-nama, j-loker, j-waktu, j-lokasi, j-tsk, j-link

### form-wa-template (line 758)

Fields: wa-id (hidden), wa-nama, wa-isi (textarea, supports `<<NAMA>>`/`<<JOB>>` placeholders)

---

## 6. i18n

| Type | Count |
|------|-------|
| `data-lang` | 253 |
| `data-lang-placeholder` | 8 |
| `data-lang-aria` | 12 |
| `data-lang-title` | 2 |
| **Total** | **275** |

Coverage: loader, header, mobile nav, public tabs, loker table, layanan cards, admin dashboard, all 8 admin tabs, candidate dashboard, footer, bottom nav.

---

## 7. External Resources

### CDN Assets

| Resource | URL |
|----------|-----|
| Logo (favicon/header) | `gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo-removebg-preview.webp` |
| Banner: Siswa Baru | `.../assets/sakra_banner.webp` |
| Banner: Visa | `.../assets/dark_tokyo_banner.webp` |
| Banner: Ujian | `.../assets/momiji_banner.webp` |
| WhatsApp link | `wa.me/6287889502004` |
| WA group | `chat.whatsapp.com/F0iP9xcdi4G8QDzn1U4bAH` |
| Google Maps | `maps.app.goo.gl/rXZ1YZAtT9JUNn6q6` |

### Local CSS/JS

| File | Purpose |
|------|---------|
| `/vendor/font-awesome/css/all.min.css` | Icons |
| `/fonts/fonts.css` | Custom fonts (Montserrat) |
| `/assets/main.css` | Tailwind CSS bundle |
| `/vendor/qrcode-generator.min.js` | QR code generation |
| `/assets/app-e1672c281c.js` | Main bundle (45 modules, 413KB) |
| `/assets/modals-shared.html` | Modal templates (XHR loaded) |

---

## 8. CSS Approach

- **Framework:** Tailwind CSS v4.3.3 (utility-first, no custom `<style>` blocks)
- **Custom classes (in main.css):** `skip-link`, `glass-panel`, `responsive-table`, `rt-active`, `marquee-track`, `custom-scrollbar`, `pb-safe`, `flow-root`, `perspective-1000`, `line-clamp-2`, `mn-bg/mn-border/mn-head/mn-dim/mn-surface`
- **Responsive:** `sm:`, `md:`, `lg:` breakpoints used extensively
- **Non-standard arbitrary values:** `rounded-[2.5rem]`, `text-[9px]`, `tracking-[0.2em]`, `max-w-[170px]`

---

## 9. Modals

### Inline (1)

| ID | Line | Description |
|----|------|-------------|
| `pamfletModal` | 1056 | Full-screen pamflet image viewer |

### Loaded via XHR from modals-shared.html

| ID | Description |
|----|-------------|
| `modal-admin` | 3-step admin login (PIN → account → personal PIN) |
| `modal-kandidat` | Candidate login/dual-form register |
| `modal-cv-mini` | CV Mini update form |
| `modal-cv` | Full candidate dossier + admin evaluation |
| `modal-edit-kandidat` | Super-edit form (operational + master) |
| `modal-list-kandidat` | List candidates per job code |

### Comment-only placeholders (modals in modals-shared.html or lazy JS)

Lines 1019-1157 contain 15+ comment placeholders for modals whose HTML lives in `modals-shared.html` or is created dynamically by JS.

---

## 10. Scripts

| Script | Line | Purpose |
|--------|------|---------|
| `qrcode-generator.min.js` | 1159 | QR code library |
| Anti-cache inline | 1161-1171 | SW version check + forced reload (2s delay, upload-safe) |
| `app-e1672c281c.js` | 1173 | Main bundle (45 modules, 413KB) |
| SHARED_MODALS inline | 1181-1215 | XHR loader for modals-shared.html |

**No ES modules** — all traditional script tags, global function scope.

---

## 11. Issues Found

### HTML

1. **`!hidden` class misuse** (lines 82, 95, 102, 115) — `!hidden` is not standard Tailwind. Should be `hidden` or `!hidden` → `!block` pattern.
2. **Duplicate `hidden` class** (lines 102, 115) — `class="!hidden hidden ..."` redundant.
3. **Missing `<caption>` on all 6 tables** — WCAG 1.3.1 issue.

### Accessibility

1. **Missing `aria-label` on search inputs** — 5 of 7 search fields lack aria-label.
2. **Missing `<label for>` bindings** — Admin form labels don't use `for` attribute.
3. **Bottom nav text `text-[9px]`** — May be below readable size for some users.

### Pre-existing

1. **Div imbalance: 222 open / 221 close** — Was already present before our changes.

---

## 12. Key Functions Referenced in HTML

`changePage`, `setLanguage`, `toggleMobileMenu`, `toggleFormLanguage`, `cobaInstallApp`, `bukaModalKandidat`, `showLoginAdminMaster`, `adminSwitchTab`, `bukaAdminAiCopilot`, `submitFormAdmin`, `submitJadwal`, `submitWaTemplate`, `filterKelolaLoker`, `filterDbJob`, `filterCbx`, `filterKandidat`, `cekUploadFile`, `mailSelectAll`, `bukaDigitalCV`, `bukaModalPemberkasan`, `bukaModalTambahKandidat`, `bukaModalGantiPass`, `bukaSimulatorInterview`, `bukaModalTtd`, `bukaMasterEksternal`, `bukaMasterLengkapPortal`, `bukaPreviewCV`, `bukaModalUndanganKelas`, `window.toggleAdminSidebar`, `mulaiKirimUndanganGrup`, `simpanCatatanCv`, `simpanSuperEditKandidat`, `downloadBiodataLengkap`, `formatInputWA`

---

## 13. admin.html — Specifics (1225 baris)

> admin.html = index.html + `IS_ADMIN_PORTAL` flag + eager XLSX load.
> 95%+ konten identik. Bagian ini fokus pada perbedaan.

### 13.1 Perbedaan dari index.html

| Aspek | admin.html | index.html |
|-------|-----------|------------|
| Lines | 1225 | 1219 (+6) |
| Flag | `window.IS_ADMIN_PORTAL = true` (line 42) | — |
| XLSX loading | **Eager** (line 1183): `<script src="/vendor/xlsx.full.min.js">` | Lazy via `muatVendorLib()` |
| Hamburger class | Tanpa `shadow-lg` (line 76) | Ada `shadow-lg` |
| Comment di script | Lines 1175-1182: penjelasan eager XLSX load | Tidak ada |

### 13.2 Trigger Perbedaan Runtime

`IS_ADMIN_PORTAL = true` dibaca oleh bundle JS untuk:
- Eager load xlsx.full.min.js (untuk admin preview workflow)
- Routing default ke admin view
- Behavior differences di beberapa admin operations

### 13.3 admin.html Specific Scripts

| Line | Script | Purpose |
|------|--------|---------|
| 42 | `<script>window.IS_ADMIN_PORTAL = true;</script>` | Admin flag |
| 1183 | `/vendor/xlsx.full.min.js?v=7f749f81a4` | Excel preview (eager) |

### 13.4 admin.html Issues

| Issue | Location | Detail |
|-------|----------|--------|
| `pamfletModal` tanpa `role="dialog"` | Line 1055 | Shared modals punya `role="dialog" aria-modal="true"`, tapi pamfletModal tidak |
| Missing `rel="noopener"` | Lines 306, 347, 380, 397 | External links (WA, Maps) open in new tab tanpa `rel="noopener noreferrer"` |

# HTML Pages — Quick Reference

> Index ringkas semua halaman HTML. Detail lengkap ada di `docs/*-DEEP.md`.
> Terakhir diperbarui: 2026-09-11 (deep scan complete).

---

## Ringkasan Struktur

```
Halaman Bundle (JS bundle assets/app-*.js):
├── index.html          — Hub utama (publik + kandidat + admin), 1219 lines
└── admin.html          — Panel admin (+ window.IS_ADMIN_PORTAL = true), 1225 lines

Halaman Standalone (type="module", entry sendiri):
├── apply-full.html     — Form lamaran 3 langkah, 371 lines
├── master-full.html    — Form master biodata 5 langkah + login gate, 379 lines
├── ai_form.html        — Chat AI + form CV bilingual (split view), 388 lines
├── siswa-baru.html     — Chat AI + form pendaftaran siswa (split view), 170 lines
└── share.html          — Public share viewer untuk kaisha, 261 lines
```

---

## Dependensi per Halaman

| Halaman | Entry Point | Backend Actions | DB Tables | Lines | DEEP Doc |
|---------|-------------|-----------------|-----------|-------|----------|
| `index.html` | bundle (`app-e1672c281c.js`) | 16 actions | multiple | 1219 | `index-admin-DEEP.md` |
| `admin.html` | bundle (sama) | 16 actions | multiple | 1225 | `index-admin-DEEP.md` |
| `apply-full.html` | `js/pages/apply_full.ts` | `cekDataPelamar`, `submitApply` | `database_asj_form`, `database_candidate`, `master_database_candidate` | 371 | `apply-full-DEEP.md` |
| `master-full.html` | `js/pages/master_full.ts` | `loginKandidat`, `getMasterDataByWa`, `submitMasterForm` | `master_database_candidate`, `database_candidate` | 379 | `master-full-DEEP.md` |
| `ai_form.html` | `js/pages/ai_form.ts` | `processAIChat`, `getDrafCvMaster`, `getAppData`, `submitDataAsj` | `master_database_candidate`, `database_candidate` | 388 | `ai_form-DEEP.md` |
| `siswa-baru.html` | `js/pages/siswa_baru.ts` | `processSiswaAIChat`, `submitDaftarSiswa` | `respon_siswa_baru` | 170 | `siswa-baru-DEEP.md` |
| `share.html` | `js/pages/share.ts` | GET `/api/share-data` | READ: 5 tables | 261 | `share-DEEP.md` |

---

## i18n Support

| Halaman | `data-lang` | `data-lang-placeholder` | Total | Notes |
|---------|-------------|------------------------|-------|-------|
| index.html | 275+ | many | ~300+ | Full bilingual (ID/JP) |
| admin.html | 275+ | many | ~300+ | Same partials as index |
| apply-full.html | **0** | **0** | **0** | All hardcoded Indonesian |
| master-full.html | 124 | 33 | **157** | Full bilingual |
| ai_form.html | 84 | 1 | **86** | Full bilingual |
| siswa-baru.html | **0** | **0** | **0** | All hardcoded Indonesian |
| share.html | 0 (JS dict) | 0 | **~30 keys** | JS-embedded i18n dictionary |

---

## Partials Usage

| Partial | index | admin | apply | master | ai_form | siswa | share |
|---------|:-----:|:-----:|:-----:|:------:|:-------:|:-----:|:-----:|
| `head-shared` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `theme-init` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `scripts-shared` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `header` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `footer` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `bottom-nav` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `public-landing` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `kandidat-dashboard` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Accessibility Comparison

| Halaman | `aria-label` | `aria-live` | `for` on labels | Skip link | Real buttons | Role attrs |
|---------|-------------|-------------|-----------------|-----------|-------------|------------|
| index.html | many | many | ✅ | ✅ | ✅ | some |
| admin.html | many | many | ✅ | ✅ | ✅ | some |
| apply-full.html | 18 | 3 | ❌ | ✅ | ✅ | ❌ |
| master-full.html | 7 | 11 | 1/66 | ✅ | ✅ | ❌ |
| ai_form.html | 5 | 3 | **0/74** | ✅ | ✅ | ❌ |
| siswa-baru.html | 12 | 4 | ❌ | ✅ | ✅ | ❌ |
| share.html | 10 | 4 | N/A | ✅ | ✅ | ❌ |

---

## CSP Policy

| Halaman | `script-src` | `frame-src` | `img-src` | Notes |
|---------|-------------|-------------|-----------|-------|
| index.html | (via HTTP header) | (via HTTP header) | (via HTTP header) | No CSP meta tag |
| admin.html | (via HTTP header) | (via HTTP header) | (via HTTP header) | No CSP meta tag |
| apply-full.html | `unsafe-eval` | **`'none'`** | `'self' https: data:` | |
| master-full.html | `unsafe-eval` | **`'none'`** | `'self' https: data:` | |
| ai_form.html | `unsafe-eval` | **`'none'`** | `'self' https: data:` | |
| siswa-baru.html | `unsafe-eval` | **`'none'`** | `'self' https: data:` | |
| share.html | `unsafe-eval` | **`'self'`** | `'self' https: data:` | Unique: allows iframe for doc preview |

---

## Cross-Page Issues Summary

### Found Across All Pages

| Issue | Pages Affected | Severity |
|-------|---------------|----------|
| Missing `<!DOCTYPE html>` | apply-full.html, ai_form.html | 🔴 High |
| Missing `<html lang>` | apply-full.html, ai_form.html | 🔴 High |
| No `<form>` element | apply, master, ai_form, siswa-baru | 🟡 Medium |
| Labels without `for` | All standalone pages | 🟡 Medium |
| `type="number"` for IDs | master-full.html (ktp, daruratWa) | 🟡 Medium |
| Broken class attr (line 100) | ai_form.html | 🔴 High |
| Inline `onclick` handlers | All pages | 🟢 Low |
| `unsafe-eval` in CSP | All standalone pages | 🟢 Low |
| Inline `style=` attributes | apply-full, master-full, ai_form | 🟢 Low |
| `.env.local` plaintext secrets | Root | 🔴 High |

---

## Shared Dependencies

| File | Digunakan Oleh | Fungsi |
|------|----------------|--------|
| `/js/core/bridge.ts` | Semua halaman | ESM bridge → window.* aliases |
| `/js/upload-guard.ts` | apply, master, ai_form, siswa-baru | Validasi file |
| `/js/cloudinary.ts` | apply, master, ai_form, siswa-baru | Upload ke Cloudinary |
| `/pwa.ts` | Semua halaman | SW + PWA features |
| `/vendor/font-awesome/css/all.min.css` | Semua halaman | Ikon |
| `/assets/main.css` | Semua halaman | Tailwind CSS |

---

## Build Pipeline

```
Source (.ts) → esbuild → Output (.js)
├── js/main.ts → assets/app-<hash>.js (bundle untuk index/admin)
├── js/pages/*.ts → js/pages/*.js (standalone pages)
├── js/core/bridge.ts → js/core/bridge.js
├── js/cloudinary.ts → js/cloudinary.js
├── pwa.ts → pwa.js
└── js/upload-guard.ts → js/upload-guard.js

HTML build:
partials/ + module-registry → build-html.mts → *.html
```

---

## PWA & Cache Strategy

| Layer | Strategy | File |
|-------|----------|------|
| SW install | `skipWaiting()` — langsung aktif | `sw.js` |
| SW activate | Delete old cache + `clients.claim()` | `sw.js` |
| SW fetch | Network-first → cache → index.html fallback | `sw.js` |
| SW invalidation | Self-check setiap 5 menit | `sw.js` |
| Client | `ASJ_FORCE_RELOAD` broadcast → auto-reload | `pwa.ts` |
| Client | Offline indicator + error boundary | `pwa.ts` |
| Netlify | `no-cache, no-store, must-revalidate` untuk HTML + SW | `netlify.toml` |
| Netlify | `max-age=31536000, immutable` untuk assets | `_headers` |

---

## Hubungan Antar Halaman

```
index.html (Hub Utama)
├── → apply-full.html     (?job=&bidang=&wa=&nama=&req=)
├── → master-full.html    (?wa=&nama=)
├── → ai_form.html        (?flow=master&job=&bidang=&wa=&nama=)
├── → siswa-baru.html     (no params)
├── → share.html          (?job=CODE)
└── → admin.html          (Admin Panel)

share.html (Public)
└── → wa.me/6287889502004  (WhatsApp ke admin)

apply-full.html, master-full.html, ai_form.html, siswa-baru.html
└── → index.html           (Back to Portal)
```

---

## Shared Partials

| Partial | Fungsi | Dipakai |
|---------|--------|---------|
| `partials/head-shared.html` | Meta tags + CSS links | Semua standalone |
| `partials/theme-init.html` | Theme init script | Semua standalone |
| `partials/scripts-shared.html` | Import map + module scripts | Semua standalone |
| `partials/header.html` | Header + nav buttons | index, admin |
| `partials/footer.html` | Footer + social links | index, admin |
| `partials/modals-shared.html` | Modal templates (via XHR) | index, admin |
| `partials/bottom-nav.html` | Mobile bottom navigation | index, admin |

---

## Workflow: Sentuh Kode HTML

1. Baca `docs/HTML_PAGES.md` (index ini) → identifikasi halaman
2. Baca `docs/<halaman>-DEEP.md` → pahami arsitektur + dependensi + flow
3. Plan perubahan → pastikan tidak merusak pipeline atau SW cache
4. Fix kode
5. Update DEEP doc jika ada perubahan struktur
6. `bun run build` → verify tidak ada error

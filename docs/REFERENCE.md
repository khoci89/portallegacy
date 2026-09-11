# REFERENCE.md — Peta Dokumen ASJ Portal

> Terakhir diperbarui: 2026-09-11
> Tujuan: satu file referensi cepat — tahu mana yang aktif, mana yang archived.

---

## ✅ DOKUMEN AKTIF (Baca ini)

| File | Updated | Isi |
|------|---------|-----|
| `AGENTS.md` | 2026-09-02 | Aturan cepat AI agent, dispatch table skill, debug checklist |
| `ASJ-PORTAL.md` | 2026-09-02 | Referensi lengkap: struktur kode, pipeline, deploy, config |
| `docs/HTML_PAGES.md` | 2026-09-02 | Peta dependensi semua halaman HTML + partial mapping |
| `docs/AI_DATA_FLOWS.md` | 2026-09-02 | Alur data AI: chat, CV parse, submit, ttd |
| `docs/AI_CV_FULL_FLOW.md` | 2026-09-02 | Flow lengkap AI CV: from chat to database |
| `docs/*-DEEP.md` (10 file) | 2026-09-02 | Deep dive per halaman: ai_form, apply-full, master-full, index-admin, share, siswa-baru, ai_parse, ai_wawancara, ai_submit_ttd, ai_admin_chat |

### Skills (Agent Tools)

| Folder | Isi |
|--------|-----|
| `skills/` (20 files) | Skill definitions: thinking, ops, research, advice, authoring |
| `.claude/` (4 files) | Claude agent configs + skills |

---

## 🗄️ ARCHIVED (Referensi saja, jangan baca untuk kerja)

Semua file di `docs/archive/` — sudah tidak aktif, dipertahankan untuk histori.

### Root Docs (archive/)

| File | Asal | Isi |
|------|------|-----|
| `PROGRESS.md` | root | Log sesi lama (2026-08-19 s/d 2026-08-20) |
| `PROGRESS2.md` | root | Log sesi terbaru (2026-09-03 s/d 2026-09-07) |
| `CHANGELOG2.md` | root | Riwayat commit (2026-08-19 s/d 2026-09-03) |
| `DEBUG-TODO.md` (44KB) | root | Debug checklist lengkap — 920 baris, sebagian besar sudah ✅ |
| `CODE_REVIEW_PERF_AUDIT.md` (28KB) | root | Code review + perf audit (2026-09-02) |
| `TODO.md` | root | Todo lama |
| `MEMORY.md` | root | Agent memory (stale) |
| `AGENTS_REFERENCE.md` | root | Duplikat AGENTS.md |

### Evals (archive/evals/) — 35 file

Semua audit satu kali dari **2026-08-20**: api-client, auth, bridge, sentry, state, nav, theme, i18n, init, loading, candidate-core, candidate-render, admin-render, admin-candidates, cv-modal, cv-builders, dbfilter, drive, esign, mail-render, rirekisho, schedule, sysconfig, util, wa-pintar, job-modal, ai-copilot, backend-ai, backend-db, build-scripts, domain, core, h7-h13, f6-f8.

### Superpowers (archive/superpowers/)

| File | Isi |
|------|-----|
| `plans/2026-08-18-todolist.md` | Plan awal migrasi |
| `plans/2026-08-26-pwa-notification-badge.md` | Plan PWA badge |
| `specs/2026-08-26-pwa-notification-badge-design.md` | Spec PWA badge |

### Legacy Parity (archive/)

| File | Isi |
|------|-----|
| `LEGACY_PARITY_ASTRO_2026-09-04.md` | Migrasi Astro → vanilla HTML |
| `PARITY_QA_ASTRO_2026-09-04.md` | QA checklist migrasi Astro |

---

## 📊 Statistik

- **Dokumen aktif:** 15 file (~80KB)
- **Dokumen archived:** 48 file (~400KB)
- **Terakhir dibersihkan:** 2026-09-11

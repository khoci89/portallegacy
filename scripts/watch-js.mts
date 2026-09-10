// =============================================================================
// watch-js.mts — Rebuild bundel otomatis saat sumber berubah (dev/preview)
// -----------------------------------------------------------------------------
// Masalah: bundel (assets/app-*.js, js/pages/*.js, js/core/bridge.js, dsb.)
// hanya dibuat oleh `npm run build:js`. Kalau sumber .ts diedit tapi build
// lupa dijalankan, halaman standalone (ai_form dll.) tetap menyajikan bundel
// STALE — bug "sudah diperbaiki di source tapi tidak muncul di preview".
//
// Script ini menonton sumber yang masuk bundel dan menjalankan ulang build
// (debounce) secara otomatis:
//   - ROOT/*.ts                 (api-client.ts, i18n.ts, pwa.ts, …)
//   - js/**/*.ts                (semua modul bundel + halaman standalone)
//   - i18n/locales/{id,jp}/**   (perubahan locale → build-i18n-jp + build-js)
// File uji (*.test.ts) diabaikan — tidak masuk bundel.
//
// Mode:
//   node scripts/watch-js.mts           → watch + initial build saja
//   node scripts/watch-js.mts --serve   → watch + jalankan serve-static.mts
//                                         in-process (satu PID; dipakai
//                                         `npm run dev`, PORT env dihormati)
//
// Build dijalankan via Node murni (Node ≥22.6 type-stripping; Node 24 aman)
// supaya tidak bergantung pada npx/tsx. Build-i18n-jp hanya jalan saat locale
// berubah; build-js selalu jalan (sumber utama bundel).
// Idempotent: aman dijalankan berkali-kali.
// =============================================================================

import { watch } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const HERE = fileURLToPath(new URL('.', import.meta.url));

const SERVE = process.argv.includes('--serve');

// --- Kumpulan path yang ditonton -------------------------------------------
// Balikkan true kalau path ini SOURCES bundel (bukan hasil build / test).
function isWatchedSource(relPath: string): boolean {
  const p = relPath.split(sep).join('/');
  if (p.includes('node_modules/') || p.startsWith('.git/')) return false;
  if (/\.test\.tsx?$/.test(p)) return false; // file uji tidak masuk bundel
  if (p === 'scripts/watch-js.mts' || p === 'serve-static.mts') return false;
  if (/^js\/.*\.tsx?$/.test(p)) return true; // seluruh modul di js/
  if (/^[^/]+\.tsx?$/.test(p)) return true; // api-client.ts, i18n.ts, pwa.ts, …
  if (/^i18n\/locales\/(id|jp)\/.*\.js$/.test(p)) return true; // locale
  return false;
}

function isLocaleSource(relPath: string): boolean {
  const p = relPath.split(sep).join('/');
  return /^i18n\/locales\/(id|jp)\/.*\.js$/.test(p);
}

// --- Jalankan build (debounced) ---------------------------------------------
let timer: ReturnType<typeof setTimeout> | null = null;
let pendingLocale = false;
let pendingPaths = new Set<string>();
let building = false;
let rebuildAfter = false;

function scheduleBuild(relPath: string, isLocale: boolean) {
  pendingPaths.add(relPath);
  if (isLocale) pendingLocale = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(runBuilds, 250); // debounce: simpan-banyak editor = 1 build
}

async function runBuilds() {
  timer = null;
  if (building) {
    rebuildAfter = true; // perubahan datang saat build — ulangi setelah selesai
    return;
  }
  building = true;
  const paths = Array.from(pendingPaths).map((p) => p.split(sep).join('/'));
  const locale = pendingLocale;
  pendingPaths = new Set();
  pendingLocale = false;
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[watch] ${ts} berubah: ${paths.slice(0, 4).join(', ')}${paths.length > 4 ? ` (+${paths.length - 4})` : ''}`);
  try {
    if (locale) {
      await sh([process.execPath, [join(HERE, 'build-i18n-jp.mts')]]);
    }
    await sh([process.execPath, [join(HERE, 'build-js.mts')]]);
    console.log(`[watch] ${new Date().toISOString().slice(11, 19)} bundel siap ✅`);
  } catch (err) {
    console.error('[watch] build GAGAL — tetap menonton; perbaiki lalu simpan ulang:', err?.message || err);
  } finally {
    building = false;
    if (rebuildAfter) {
      rebuildAfter = false;
      runBuilds();
    }
  }
}

async function sh(cmd: [string, string[]]) {
  const { spawn } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd[0], cmd[1], { stdio: ['ignore', 'inherit', 'inherit'], shell: false });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd[1][0]} exit ${code}`))));
    child.on('error', reject);
  });
}

// --- Tonton direktori --------------------------------------------------------
const watchedDirs = [ROOT, join(ROOT, 'js'), join(ROOT, 'i18n'), join(ROOT, 'i18n', 'locales'), join(ROOT, 'i18n', 'locales', 'id'), join(ROOT, 'i18n', 'locales', 'jp')];

for (const dir of watchedDirs) {
  watch(dir, { recursive: true }, (_event, filename) => {
    if (!filename) return; // rename tanpa nama — abaikan (aman: debounce berikut menangkap)
    const rel = relative(ROOT, join(dir, filename));
    if (!isWatchedSource(rel)) return;
    scheduleBuild(rel, isLocaleSource(rel));
  });
}

console.log('[watch] menonton sumber: ROOT/*.ts, js/**/*.ts, i18n/locales/{id,jp}/**');

// --- Initial build: pastikan bundel fresh sebelum server jalan ---------------
console.log('[watch] build awal (i18n + js)…');
try {
  await sh([process.execPath, [join(HERE, 'build-i18n-jp.mts')]]);
  await sh([process.execPath, [join(HERE, 'build-js.mts')]]);
  console.log('[watch] build awal selesai ✅');
} catch (err) {
  console.error('[watch] build awal GAGAL:', err?.message || err);
  if (!SERVE) process.exit(1);
}

// --- Mode --serve: jalankan server preview in-process ------------------------
if (SERVE) {
  console.log(`[watch] menjalankan serve-static.mts (PORT=${Number(process.env.PORT) || 3000})…`);
  // pathToFileURL: di Windows, import() butuh file:// URL (bukan F:\…) — tanpa ini
  // dynamic import gagal dengan ERR_UNSUPPORTED_ESM_URL_SCHEME.
  await import(pathToFileURL(join(ROOT, 'serve-static.mts')).href);
}

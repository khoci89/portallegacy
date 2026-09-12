// =============================================================
// e2e/repro-admin-cv-flow.mjs — REPRODUKSI bug "sesi admin hilang setelah
// benerin CV AI kandidat".
// -------------------------------------------------------------
// Cara pakai (preview lokal harus jalan lebih dulu):
//   node scripts/local-preview.mts            # terminal 1
//   node e2e/repro-admin-cv-flow.mjs          # terminal 2
//
// Skrip ini mengemudikan browser sungguhan:
//   1. Login admin lewat UI (PIN master → pilih admin → PIN personal).
//   2. Instrumentasi SEBELUM skrip halaman jalan:
//      - setiap respons /api/* yang memuat sessionInvalid:true dicatat
//      - setiap localStorage.removeItem('asj_*') dicatat BESERTA stack trace
//        → jadi ketahuan persis kode mana yang menghapus sesi.
//   3. Buka AI CV kandidat dari panel admin (generateAiFormBridge) seperti
//      tombol admin, lalu telusuri halaman yang muncul.
//   4. Laporkan kapan sesi admin hilang.
// =============================================================
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787';

function envLocal(key, fallback = '') {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[1] === key) return m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return fallback;
}

const MASTER_PIN = envLocal('ADMIN_MASTER_PIN');
const ADMIN_NAME = process.env.E2E_ADMIN_NAME || 'KHOCI';
const ADMIN_PIN = envLocal('PIN_' + ADMIN_NAME);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// --- Instrumentasi (jalan SEBELUM skrip halaman apa pun) --------------------
// PENTING: log disimpan di sessionStorage, BUKAN variabel window — kalau
// halaman melakukan redirect (window.location.href / reload), variabel window
// hilang. sessionStorage bertahan sepanjang tab.
await page.addInitScript(() => {
  const w = window;
  const SS_KEY = '__ASJ_EV';
  const origSet = Storage.prototype.setItem;
  const origRemove = Storage.prototype.removeItem;

  const read = () => {
    try {
      return JSON.parse(sessionStorage.getItem(SS_KEY) || '[]');
    } catch {
      return [];
    }
  };
  const push = (o) => {
    const arr = read();
    arr.push(o);
    if (arr.length > 800) arr.splice(0, arr.length - 800);
    try {
      origSet.call(sessionStorage, SS_KEY, JSON.stringify(arr));
    } catch {}
  };
  w.__EVread = read;

  const origFetch = w.fetch;
  w.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      if (/\/api\/|\.netlify\/functions/.test(url)) {
        let sent = '';
        let act = '';
        try {
          const b = JSON.parse((args[1] && args[1].body) || '{}');
          sent = b.sessionToken || '';
          act = b.action || '';
        } catch {}
        const txt = await res.clone().text();
        let body = null;
        try {
          body = JSON.parse(txt);
        } catch {}
        push({
          kind: 'fetch',
          page: location.pathname,
          action: act,
          url: String(url).split('/api/')[1] || String(url),
          status: res.status,
          sentTokenLen: String(sent).length,
          sessionInvalid: !!(body && body.sessionInvalid),
          snippet: txt.slice(0, 120),
        });
      }
    } catch {}
    return res;
  };

  for (const fn of ['removeItem', 'setItem']) {
    const orig = Storage.prototype[fn];
    Storage.prototype[fn] = function (k, v) {
      try {
        if (String(k).indexOf('asj_') === 0) {
          const stack = (new Error().stack || '')
            .split('\n')
            .slice(2, 6)
            .map((s) => s.trim().replace(/^at\s+/, ''))
            .join(' | ');
          push({
            kind: fn,
            page: location.pathname,
            key: String(k),
            value: fn === 'setItem' ? String(v === undefined ? '' : v).length + ' char' : undefined,
            stack: stack.slice(0, 240),
          });
        }
      } catch {}
      return fn === 'setItem' ? orig.call(this, k, v) : orig.call(this, k);
    };
  }
});

function events() {
  return page.evaluate(() => (window.__EVread ? window.__EVread() : [])).catch(() => []);
}
async function snapshot(label) {
  const s = await page
    .evaluate(() => ({
      path: location.pathname + location.search,
      adminLogin: localStorage.getItem('asj_admin_login'),
      adminSessionLen: (localStorage.getItem('asj_admin_session') || '').length,
      adminRefreshLen: (localStorage.getItem('asj_admin_refresh') || '').length,
      kandidatLogin: localStorage.getItem('asj_kandidat_login'),
      kandidatSessionLen: (localStorage.getItem('asj_kandidat_session') || '').length,
    }))
    .catch((e) => ({ error: e.message }));
  console.log(`\n── ${label}`);
  console.log(`   ${JSON.stringify(s)}`);
  return s;
}

// --- 1. Login admin lewat UI ------------------------------------------------
console.log(`Target: ${BASE}\n`);
await page.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await page
  .evaluate(async () => {
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  })
  .catch(() => {});

const waitFor = async (fn, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

const modalOpen = await waitFor(() => page.locator('#modal-admin').isVisible().catch(() => false));
if (!modalOpen) await page.evaluate(() => window.showLoginAdminMaster && window.showLoginAdminMaster());
await page.fill('#admin-pin-master', MASTER_PIN);
await page.click('#btn-login-master');
await waitFor(() => page.locator('#login-step-2').isVisible().catch(() => false));
await page.click(`[onclick*="showLoginPersonal('${ADMIN_NAME}')"]`);
await waitFor(() => page.locator('#login-step-3').isVisible().catch(() => false));
await page.fill('#admin-pin-personal', ADMIN_PIN);
await page.evaluate(() => document.getElementById('btn-login-personal').click());
const adminOk = await waitFor(() =>
  page.evaluate(() => {
    const el = document.getElementById('page-admin');
    return !!el && getComputedStyle(el).display !== 'none';
  }),
);
console.log(adminOk ? 'Login admin: OK' : 'Login admin: GAGAL — hentikan');
if (!adminOk) {
  await browser.close();
  process.exit(1);
}
await snapshot('setelah login admin');

// --- 2. Pilih kandidat dari dashboard --------------------------------------
// CATATAN: window.ALL_CANDIDATES hanya terisi setelah tabel di-render
// (ensureAllCandidates). Sumber yang selalu ada = respons getAppData('admin').
const cand = await page.evaluate(async () => {
  let list = window.ALL_CANDIDATES || [];
  if (!list.length) {
    try {
      const res = await window.callAPI('getAppData', ['admin']);
      if (res && Array.isArray(res.candidates)) list = res.candidates;
    } catch {}
  }
  const c = list.find((x) => x && (x.wa || x.no_wa || x.whatsapp)) || null;
  return c
    ? { wa: c.wa || c.no_wa || c.whatsapp, nama: c.nama || c.nama_lengkap || 'KANDIDAT' }
    : null;
});
if (!cand) {
  console.log('Tidak ada kandidat di dashboard — hentikan.');
  await browser.close();
  process.exit(1);
}
console.log(`\nKandidat uji: ${cand.nama} (${cand.wa})`);

// --- 3. Buka AI CV seperti tombol admin (generateAiFormBridge) --------------
const formUrl = await page.evaluate(
  async ([wa, nama]) => {
    const res = await window.callAPI('generateAiFormBridge', ['ai', '', '', wa, nama]);
    return res && res.formUrl ? res.formUrl : null;
  },
  [cand.wa, cand.nama],
);
console.log(`formUrl: ${formUrl || '(tidak ada)'}`);
if (!formUrl) {
  console.log('generateAiFormBridge tidak mengembalikan formUrl — hentikan.');
  await browser.close();
  process.exit(1);
}

const target = new URL(formUrl, BASE).href.replace(/^https?:\/\/[^/]+/, BASE);
await page.goto(target, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000); // beri waktu auto-fill / redirect internal
await snapshot('setelah membuka AI CV kandidat');

// --- 4. Klik tombol-tombol yang ada di halaman ------------------------------
const clicked = [];
for (const sel of ['#btn-back', '#btn-kembali', '[onclick*="kembali"]', '#btn-next', '#btn-lanjut']) {
  const n = await page.locator(sel).count();
  if (n > 0) {
    try {
      await page.locator(sel).first().click({ timeout: 3000 });
      clicked.push(sel);
      await page.waitForTimeout(2500);
      await snapshot(`setelah klik ${sel}`);
    } catch (e) {
      console.log(`   (klik ${sel} gagal: ${e.message.split('\n')[0]})`);
    }
  }
}
console.log(`\nTombol diklik: ${clicked.length ? clicked.join(', ') : '(tidak ada yang cocok)'}`);

// --- 5. Laporan -------------------------------------------------------------
const ev = await events();
const invalid = ev.filter((e) => e.kind === 'fetch' && e.sessionInvalid);
const removals = ev.filter((e) => e.kind === 'removeItem' && /session|login/.test(e.key));
const emptySession = ev.filter((e) => e.kind === 'setItem' && /session/.test(e.key) && e.value === '0 char');

console.log('\n================ LAPORAN ================');
console.log(`Respons sessionInvalid : ${invalid.length}`);
for (const e of invalid) console.log(`   [${e.page}] ${e.url} → ${e.snippet}`);
console.log(`Penghapusan key sesi   : ${removals.length}`);
for (const e of removals) console.log(`   [${e.page}] removeItem(${e.key}) ← ${e.stack}`);
console.log(`Penulisan sesi KOSONG  : ${emptySession.length}`);
for (const e of emptySession) console.log(`   [${e.page}] setItem(${e.key}) = '' ← ${e.stack}`);

await snapshot('kondisi akhir');
await browser.close();
process.exit(invalid.length === 0 && removals.length === 0 ? 0 : 2);

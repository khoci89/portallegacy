// Probe v3 — telusuri JALUR SESI ADMIN secara menyeluruh (read-only).
//
// Fokus: setelah admin "benerin CV AI siswa" lalu kembali / klik tombol,
// kapan & OLEH KODE MANA sesi admin hilang / jadi kosong.
//
// Semua langkah READ-ONLY (tidak menulis data kandidat). Kita hanya
// menavigasi + mengklik tombol navigasi, sambil merekam:
//   - setiap respons /api/* yang memuat sessionInvalid:true
//   - setiap removeItem/setItem pada key asj_* BESERTA stack trace
//
// Pakai: node scripts/local-preview.mts   (terminal 1)
//        node e2e/_probe3.mjs             (terminal 2)
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787';

function envLocal(k, fb = '') {
  try {
    for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = l.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[1] === k) return m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return fb;
}

const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));

await p.addInitScript(() => {
  const w = window;
  const SS = '__ASJ_EV3';
  const oSet = Storage.prototype.setItem;
  const oRem = Storage.prototype.removeItem;
  const read = () => {
    try {
      return JSON.parse(sessionStorage.getItem(SS) || '[]');
    } catch {
      return [];
    }
  };
  const push = (o) => {
    const a = read();
    a.push(o);
    if (a.length > 1500) a.splice(0, a.length - 1500);
    try {
      oSet.call(sessionStorage, SS, JSON.stringify(a));
    } catch {}
  };
  w.__EVread = read;

  const oFetch = w.fetch;
  w.fetch = async function (...args) {
    const res = await oFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      if (/\/api\/|\.netlify\/functions/.test(url)) {
        let sent = '';
        let act = '';
        try {
          const bd = JSON.parse((args[1] && args[1].body) || '{}');
          sent = bd.sessionToken || '';
          act = bd.action || '';
        } catch {}
        const txt = await res.clone().text();
        let body = null;
        try {
          body = JSON.parse(txt);
        } catch {}
        push({
          k: 'fetch',
          page: location.pathname,
          action: act,
          status: res.status,
          tokenLen: String(sent).length,
          invalid: !!(body && body.sessionInvalid),
          snip: txt.slice(0, 100),
        });
      }
    } catch {}
    return res;
  };

  for (const fn of ['removeItem', 'setItem']) {
    const o = Storage.prototype[fn];
    Storage.prototype[fn] = function (k, v) {
      try {
        if (String(k).indexOf('asj_') === 0) {
          push({
            k: fn,
            page: location.pathname,
            key: String(k),
            val: fn === 'setItem' ? String(v === undefined ? '' : v).length + 'c' : undefined,
            stack: (new Error().stack || '')
              .split('\n')
              .slice(2, 6)
              .map((s) => s.trim().replace(/^at\s+/, ''))
              .join(' | ')
              .slice(0, 220),
          });
        }
      } catch {}
      return fn === 'setItem' ? o.call(this, k, v) : o.call(this, k);
    };
  }
});

const ev = () => p.evaluate(() => (window.__EVread ? window.__EVread() : [])).catch(() => []);
const snap = async (label) => {
  const s = await p
    .evaluate(() => ({
      path: location.pathname + location.search.slice(0, 40),
      admLogin: localStorage.getItem('asj_admin_login'),
      admSess: (localStorage.getItem('asj_admin_session') || '').length,
      admRef: (localStorage.getItem('asj_admin_refresh') || '').length,
      kanLogin: localStorage.getItem('asj_kandidat_login'),
      kanSess: (localStorage.getItem('asj_kandidat_session') || '').length,
      gate: (() => {
        const g = document.getElementById('login-gate');
        return g ? !g.classList.contains('hidden') : null;
      })(),
      pageAdmin: (() => {
        const e = document.getElementById('page-admin');
        return e ? getComputedStyle(e).display : null;
      })(),
    }))
    .catch((e) => ({ err: e.message }));
  console.log(`\n── ${label}\n   ${JSON.stringify(s)}`);
  return s;
};

const waitFor = async (fn, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

// ---------- 1. login admin ----------
await p.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await p
  .evaluate(async () => {
    if (navigator.serviceWorker) {
      const r = await navigator.serviceWorker.getRegistrations();
      await Promise.all(r.map((x) => x.unregister()));
    }
    if (window.caches) {
      const ks = await caches.keys();
      await Promise.all(ks.map((k) => caches.delete(k)));
    }
  })
  .catch(() => {});

if (!(await p.locator('#modal-admin').isVisible().catch(() => false))) {
  await p.evaluate(() => window.showLoginAdminMaster && window.showLoginAdminMaster());
}
await p.waitForTimeout(400);
await p.fill('#admin-pin-master', envLocal('ADMIN_MASTER_PIN'));
await p.click('#btn-login-master');
await waitFor(() => p.locator('#login-step-2').isVisible().catch(() => false), 15000);
await p.click(`[onclick*="showLoginPersonal('KHOCI')"]`);
await waitFor(() => p.locator('#login-step-3').isVisible().catch(() => false), 15000);
await p.fill('#admin-pin-personal', envLocal('PIN_KHOCI'));
await p.evaluate(() => document.getElementById('btn-login-personal').click());
const ok = await waitFor(() =>
  p.evaluate(() => {
    const e = document.getElementById('page-admin');
    return !!e && getComputedStyle(e).display !== 'none';
  }),
);
console.log('Login admin:', ok ? 'OK' : 'GAGAL');
if (!ok) {
  await b.close();
  process.exit(1);
}
await p.waitForTimeout(3000);
await snap('1. setelah login admin');

// ---------- 2. kandidat uji ----------
const cand = await p.evaluate(async () => {
  let list = window.ALL_CANDIDATES || [];
  if (!list.length) {
    try {
      const r = await window.callAPI('getAppData', ['admin']);
      if (r && Array.isArray(r.candidates)) list = r.candidates;
    } catch {}
  }
  const c = list.find((x) => x && (x.wa || x.no_wa || x.whatsapp)) || null;
  return c ? { wa: c.wa || c.no_wa || c.whatsapp, nama: c.nama || 'KANDIDAT' } : null;
});
console.log('\nKandidat uji:', cand ? `${cand.nama} (${cand.wa})` : 'TIDAK ADA');
if (!cand) {
  await b.close();
  process.exit(1);
}

// ---------- 3. AI CV (bridge) — seperti klik tombol admin ----------
const formUrl = await p.evaluate(
  async ([wa, nama]) => {
    const r = await window.callAPI('generateAiFormBridge', ['ai', '', '', wa, nama]);
    return r && r.formUrl ? r.formUrl : null;
  },
  [cand.wa, cand.nama],
);
const localUrl = formUrl ? formUrl.replace(/^https?:\/\/[^/]+/, BASE) : BASE + '/ai_form.html';
console.log('\nAI CV →', localUrl.slice(0, 110));
await p.goto(localUrl, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(6000);
await snap('2. halaman AI CV terbuka');
console.log(
  '   URL akhir:',
  await p.evaluate(() => location.pathname + location.search.slice(0, 60)),
);

// ---------- 4. tombol-tombol navigasi di AI CV ----------
for (const sel of ['#btnTabForm', '#btnTabChat', '#btn-kembali', '[onclick*="kembali"]', '[onclick*="back"]']) {
  const n = await p.locator(sel).count().catch(() => 0);
  if (!n) continue;
  try {
    await p.locator(sel).first().click({ timeout: 2500 });
    await p.waitForTimeout(1800);
    await snap(`3. klik ${sel}`);
  } catch {}
}

// ---------- 5. BUKA master-full.html?wa=… (jalur Form Master) ----------
await p.goto(BASE + '/master-full.html?wa=' + encodeURIComponent(cand.wa), {
  waitUntil: 'domcontentloaded',
});
await p.waitForTimeout(5000);
await snap('4. master-full.html?wa=… (tanpa sesi kandidat)');
console.log('   gate terlihat =', await p.evaluate(() => {
  const g = document.getElementById('login-gate');
  return g ? !g.classList.contains('hidden') : null;
}));

// ---------- 6. KEMBALI ke panel admin ----------
await p.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(5000);
await snap('5. kembali ke admin.html');

// klik beberapa tab admin
for (const sel of ['[onclick*="adminSwitchTab"]', '[onclick*="changePage"]']) {
  const n = await p.locator(sel).count().catch(() => 0);
  for (let i = 0; i < Math.min(n, 3); i++) {
    try {
      await p.locator(sel).nth(i).click({ timeout: 2500 });
      await p.waitForTimeout(1500);
      await snap(`6. klik admin ${sel} #${i}`);
    } catch {}
  }
}

// ---------- laporan ----------
const all = await ev();
const inv = all.filter((e) => e.k === 'fetch' && e.invalid);
const rem = all.filter((e) => e.k === 'removeItem' && /session|login|refresh/.test(e.key));
const empty = all.filter((e) => e.k === 'setItem' && /session/.test(e.key) && e.val === '0c');

console.log('\n================ LAPORAN ================');
console.log(`sessionInvalid pada respons : ${inv.length}`);
for (const e of inv) console.log(`   [${e.page}] ${e.action} → ${e.snip}`);
console.log(`removeItem key sesi          : ${rem.length}`);
for (const e of rem) console.log(`   [${e.page}] ${e.key} ← ${e.stack}`);
console.log(`setItem sesi jadi KOSONG     : ${empty.length}`);
for (const e of empty) console.log(`   [${e.page}] ${e.key} = '' ← ${e.stack}`);
const noToken = all.filter((e) => e.k === 'fetch' && /admin|kandidat/.test(e.action || '') && e.tokenLen === 0);
console.log(`request TANPA token          : ${noToken.length}`);
for (const e of noToken.slice(0, 8)) console.log(`   [${e.page}] ${e.action} tokenLen=0 → ${e.snip}`);

await b.close();

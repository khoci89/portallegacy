// Probe v2 — login admin TAHAN-GAGAL + dump bentuk respons getAppData('admin')
// supaya ketahuan di mana daftar kandidat sebenarnya disimpan di frontend.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787';
function envLocal(k) {
  try {
    for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = l.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[1] === k) return m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return '';
}

const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
p.on('console', (m) => {
  if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200));
});

const waitFor = async (fn, ms = 25000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

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
await p.waitForTimeout(500);
await p.fill('#admin-pin-master', envLocal('ADMIN_MASTER_PIN'));
await p.click('#btn-login-master');

const step2 = await waitFor(() => p.locator('#login-step-2').isVisible().catch(() => false), 12000);
console.log('step-2 tampil:', step2);
if (!step2) {
  const txt = await p
    .evaluate(() => document.getElementById('modal-admin')?.innerText?.slice(0, 300) || '')
    .catch(() => '');
  console.log('teks modal:', JSON.stringify(txt));
  await b.close();
  process.exit(1);
}

await p.click(`[onclick*="showLoginPersonal('KHOCI')"]`);
const step3 = await waitFor(() => p.locator('#login-step-3').isVisible().catch(() => false), 12000);
console.log('step-3 tampil:', step3);
await p.fill('#admin-pin-personal', envLocal('PIN_KHOCI'));
await p.evaluate(() => document.getElementById('btn-login-personal').click());

const ok = await waitFor(() =>
  p.evaluate(() => {
    const e = document.getElementById('page-admin');
    return !!e && getComputedStyle(e).display !== 'none';
  }),
  20000,
);
console.log('panel admin tampil:', ok);
await p.waitForTimeout(4000);

const dump = await p.evaluate(async () => {
  const out = { path: location.pathname, adminLogin: localStorage.getItem('asj_admin_login') };
  try {
    const res = await window.callAPI('getAppData', ['admin']);
    out.resKeys = res ? Object.keys(res) : null;
    out.success = res && res.success;
    out.sessionInvalid = res && res.sessionInvalid;
    out.candidatesLen = res && Array.isArray(res.candidates) ? res.candidates.length : typeof res?.candidates;
    const c0 = res && Array.isArray(res.candidates) ? res.candidates[0] : null;
    out.firstCandidateKeys = c0 ? Object.keys(c0).slice(0, 20) : null;
    out.firstCandidateWa =
      c0 && (c0.wa || c0.no_wa || c0.whatsapp || c0.NO_WA || c0.WA) ? String(c0.wa || c0.no_wa || c0.whatsapp || c0.NO_WA || c0.WA) : null;
  } catch (e) {
    out.err = String(e).slice(0, 200);
  }
  out.globals = Object.keys(window).filter((k) => /cand|CAND|data|DATA/i.test(k)).slice(0, 30);
  return out;
});
console.log(JSON.stringify(dump, null, 1));

await b.close();

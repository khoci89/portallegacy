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
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));
await p.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await p
  .evaluate(async () => {
    if (navigator.serviceWorker) {
      const r = await navigator.serviceWorker.getRegistrations();
      await Promise.all(r.map((x) => x.unregister()));
    }
  })
  .catch(() => {});
const wf = async (f, ms = 20000) => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (await f()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};
if (!(await p.locator('#modal-admin').isVisible().catch(() => false)))
  await p.evaluate(() => window.showLoginAdminMaster && window.showLoginAdminMaster());
await p.fill('#admin-pin-master', envLocal('ADMIN_MASTER_PIN'));
await p.click('#btn-login-master');
await wf(() => p.locator('#login-step-2').isVisible().catch(() => false));
await p.click(`[onclick*="showLoginPersonal('KHOCI')"]`);
await wf(() => p.locator('#login-step-3').isVisible().catch(() => false));
await p.fill('#admin-pin-personal', envLocal('PIN_KHOCI'));
await p.evaluate(() => document.getElementById('btn-login-personal').click());
await wf(() =>
  p.evaluate(() => {
    const e = document.getElementById('page-admin');
    return !!e && getComputedStyle(e).display !== 'none';
  }),
);
await p.waitForTimeout(4000);
const info = await p.evaluate(() => ({
  globals: Object.keys(window).filter((k) => /cand|CAND|job|JOB|applicant/i.test(k)).slice(0, 25),
  allCand: (window.ALL_CANDIDATES || []).length,
  tables: Array.from(document.querySelectorAll('tbody'))
    .map((t) => (t.id || '(no-id)') + ':' + t.querySelectorAll('tr').length)
    .slice(0, 20),
  firstCand: (() => {
    const l = window.ALL_CANDIDATES || [];
    const c = l[0] || null;
    return c ? Object.keys(c).slice(0, 14) : null;
  })(),
}));
console.log(JSON.stringify(info, null, 1));
await b.close();

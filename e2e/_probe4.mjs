// Verifikasi keamanan: TANPA sesi apa pun, Form Master WAJIB tetap bergerbang.
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787';
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto(BASE + '/master-full.html?wa=628134081086', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4500);
const st = await p.evaluate(() => ({
  admLogin: localStorage.getItem('asj_admin_login'),
  kanLogin: localStorage.getItem('asj_kandidat_login'),
  gate: (() => { const g = document.getElementById('login-gate'); return g ? !g.classList.contains('hidden') : null; })(),
}));
console.log('TANPA SESI →', JSON.stringify(st));
console.log(st.gate === true ? 'AMAN: gerbang tetap tampil untuk pengunjung tanpa sesi' : 'BAHAYA: gerbang bocor!');
await b.close();
process.exit(st.gate === true ? 0 : 2);

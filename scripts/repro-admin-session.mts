// =============================================================================
// repro-admin-session.mts — Reproduksi bug "admin ter-logout setelah benerin
// CV kandidat".
// -----------------------------------------------------------------------------
// Cara pakai (preview harus jalan dulu):
//   node scripts/local-preview.mts          # terminal 1
//   node scripts/repro-admin-session.mts    # terminal 2
//
// Yang diuji: dengan TOKEN ADMIN yang masih sah, panggil action yang dipakai
// halaman AI CV / Form Master. Kalau server membalas `sessionInvalid: true`,
// api-client akan MENGHAPUS SEMUA SESI (admin + kandidat) lalu reload —
// itulah mekanisme admin ter-logout. Action yang membalas sessionInvalid
// dicetak sebagai FAIL.
// =============================================================================

import { readFileSync } from 'node:fs';

const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:8787';

function envLocal(key: string): string {
  try {
    const raw = readFileSync('.env.local', 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[1] === key) return m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return '';
}

async function api(action: string, payload: any, sessionToken?: string) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload, sessionToken }),
  });
  return res.json();
}

async function callFn(fn: string, action: string, payload: any, sessionToken?: string) {
  const res = await fetch(`${BASE}/api/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload, sessionToken }),
  });
  return res.json();
}

const name = process.env.ADMIN_NAME || 'khoci';
const pin = envLocal('PIN_KHOCI') || envLocal('ADMIN_MASTER_PIN');
if (!pin) {
  console.error('PIN admin tidak ditemukan di .env.local (PIN_KHOCI / ADMIN_MASTER_PIN).');
  process.exit(1);
}

const login = await api('checkAdminPersonal', [name, pin, '']);
if (!login || !login.success || !login.sessionToken) {
  console.error('Login admin GAGAL:', JSON.stringify(login).slice(0, 300));
  process.exit(1);
}
const adminToken = login.sessionToken;
console.log(`Login admin "${name}" OK — token admin didapat (${adminToken.length} char).\n`);

const DUMMY_WA = '6280000000000';

// Action yang benar-benar dipanggil halaman AI CV (ai_form) + Form Master
// (master-full) yang dibuka admin dari panel admin.
// [label, nama fungsi Netlify, nama action, payload]
// PENTING: hanya action READ-ONLY. Preview ini memakai Supabase PRODUKSI
// (kredensial dari .env.local), jadi jangan pernah memasukkan action yang
// menulis (simpanUpdateMaster, simpanBerkasTahapan dengan file, dll.) —
// bisa mencemari data asli. Yang diuji cuma GUARD sesi di awal handler.
const CASES: Array<[string, string, string, any]> = [
  ['getAppData (mode kandidat)', 'get-app-data', 'getAppData', ['kandidat', DUMMY_WA]],
  ['getDrafCvMaster', 'master-data', 'getDrafCvMaster', [DUMMY_WA]],
  ['getMasterDataByWa', 'master-data', 'getMasterDataByWa', [DUMMY_WA]],
  ['getExistingCandidateJsonByWa', 'apply', 'getExistingCandidateJsonByWa', [DUMMY_WA]],
  ['simpanRevisiKandidat (tolak awal)', 'master-data', 'simpanRevisiKandidat', [DUMMY_WA, {}]],
  ['simpanBerkasTahapan (tolak awal)', 'master-data', 'simpanBerkasTahapan', [{ wa: DUMMY_WA }]],
  // Action yang dipanggil TOMBOL "SIMPAN DB" di AI CV. Payload sengaja tanpa
  // WA → handler berhenti di validasi awal ("Nomor WA tidak ditemukan"),
  // TIDAK ada tulis ke Supabase, tapi guard sesi tetap teruji.
  [
    'submitDataAsj (tolak awal)',
    'ai-form-submit',
    'submitDataAsj',
    [{ context: {}, identitas: {} }],
  ],
  ['submitMasterForm (tolak awal)', 'master-data', 'submitMasterForm', [{}]],
];

let fail = 0;
for (const [label, fn, action, payload] of CASES) {
  let out: any;
  try {
    out = await callFn(fn, action, payload, adminToken);
  } catch (e: any) {
    console.log(`?    ${label.padEnd(30)} → error jaringan: ${e.message}`);
    continue;
  }
  const isSessionInvalid = !!(out && out.sessionInvalid);
  if (isSessionInvalid) fail++;
  console.log(
    `${isSessionInvalid ? 'FAIL' : 'ok  '} ${label.padEnd(30)} → ` +
      `sessionInvalid=${isSessionInvalid} ${JSON.stringify(out).slice(0, 110)}`,
  );
}

console.log(
  `\n${fail === 0 ? 'LULUS' : 'GAGAL'}: ${fail} action membalas sessionInvalid saat dipanggil dengan token admin.`,
);
if (fail > 0) {
  console.log(
    'Setiap sessionInvalid di atas = api-client menghapus SEMUA sesi + reload → admin ter-logout.',
  );
}
process.exit(fail === 0 ? 0 : 2);

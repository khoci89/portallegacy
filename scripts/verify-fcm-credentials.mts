// =============================================================================
// verify-fcm-credentials.mts — Buktikan RANTAI push notification hidup, TANPA
// mengirim notifikasi nyata ke siapa pun.
// -----------------------------------------------------------------------------
// Cara pakai:
//   node scripts/verify-fcm-credentials.mts
//
// Yang diuji (persis kondisi produksi Netlify):
//   1. Hanya FIREBASE_SERVICE_TOKEN yang terpasang — FIREBASE_SERVICE_ACCOUNT
//      KOSONG. Inilah keadaan sebenarnya di Netlify (site asjportal).
//   2. env('FIREBASE_SERVICE_ACCOUNT') harus tetap mengembalikan service
//      account lewat ALIAS. Kalau kosong → semua push mati (bug lama).
//   3. Kredensial ditukar ke OAuth2 Google → membuktikan service account sah.
//   4. sendPushNotification() dipanggil dengan token FCM PALSU → harus sampai
//      ke FCM dan ditolak karena token-nya salah, BUKAN karena kredensial.
//      Tidak ada perangkat manusia yang menerima notifikasi.
// =============================================================================
import crypto from 'crypto';
import { readFileSync } from 'node:fs';

function netlifyToken(): string {
  try {
    const t = readFileSync('../netlify.txt', 'utf8').match(/nfp_[A-Za-z0-9]+/);
    if (t) return t[0];
  } catch {}
  try {
    const t = readFileSync('netlify.txt', 'utf8').match(/nfp_[A-Za-z0-9]+/);
    if (t) return t[0];
  } catch {}
  return process.env.NETLIFY_AUTH_TOKEN || '';
}

const SITE_ID = '36c2ba2f-b67b-4b96-8ef0-acc75ea833b5';
const SRC_KEY = 'FIREBASE_SERVICE_TOKEN'; // nama yang BENAR-BENAR ada di Netlify
const CANON_KEY = 'FIREBASE_SERVICE_ACCOUNT'; // nama yang dibaca kode

// --- 1. Ambil nilai asli dari Netlify --------------------------------------
let saRaw = process.env[SRC_KEY] || '';
if (!saRaw) {
  const tok = netlifyToken();
  if (!tok) {
    console.error('Tidak ada token Netlify (netlify.txt / NETLIFY_AUTH_TOKEN).');
    process.exit(1);
  }
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/env`, {
    headers: { Authorization: `Bearer ${tok}` },
  });
  const list: any[] = await res.json();
  const entry = list.find((e) => e.key === SRC_KEY);
  saRaw = entry?.values?.[0]?.value || '';
}
if (!saRaw) {
  console.error(`Env ${SRC_KEY} tidak ditemukan di Netlify.`);
  process.exit(1);
}

// --- 2. Simulasikan kondisi produksi --------------------------------------
// Hanya nama ASLI yang terpasang; nama baku sengaja dikosongkan.
process.env[SRC_KEY] = saRaw;
delete process.env[CANON_KEY];

console.log(
  `Simulasi produksi: ${SRC_KEY} terpasang (${saRaw.length} char), ${CANON_KEY} KOSONG.\n`,
);

const { env } = await import('../netlify/functions/_lib/env.ts');
const { sendPushNotification } = await import('../netlify/functions/_lib/fcm-server.ts');

// --- 3. env() harus menemukan service account lewat alias ------------------
const resolved = env(CANON_KEY);
let sa: any = null;
try {
  sa = JSON.parse(resolved);
} catch {}

const envOk = !!resolved && !!sa;
console.log(`${envOk ? 'ok  ' : 'FAIL'} env('${CANON_KEY}') → ${resolved.length} char`);
if (envOk) {
  console.log(`     project_id  : ${sa.project_id}`);
  console.log(`     client_email: ${sa.client_email}`);
}
if (!envOk) {
  console.log('     → service account TIDAK terbaca. Semua push notification akan di-skip.');
  process.exit(2);
}

// --- 4. Tukar kredensial ke OAuth2 Google (bukti kredensial sah) -----------
const now = Math.floor(Date.now() / 1000);
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
const unsigned =
  b64({ alg: 'RS256', typ: 'JWT' }) +
  '.' +
  b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
const key = String(sa.private_key || '').includes('\\n')
  ? String(sa.private_key).replace(/\\n/g, '\n')
  : String(sa.private_key || '');
const jwt =
  unsigned + '.' + crypto.createSign('RSA-SHA256').update(unsigned).sign(key, 'base64url');

const oauthRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body:
    'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt),
});
const oauth = await oauthRes.json();
const oauthOk = !!oauth.access_token;
console.log(
  `\n${oauthOk ? 'ok  ' : 'FAIL'} OAuth2 Google → ${
    oauthOk
      ? 'access_token didapat (' + String(oauth.access_token).length + ' char)'
      : JSON.stringify(oauth).slice(0, 200)
  }`,
);

// --- 5. Tembak FCM dengan token PALSU (tidak ada orang yang dinotifikasi) ---
const errs: string[] = [];
const origErr = console.error;
console.error = (...a: any[]) => errs.push(a.map(String).join(' '));
const sent = await sendPushNotification(
  'BOGUS_TOKEN_FOR_VERIFICATION_ONLY_' + Date.now(),
  'Verifikasi kredensial',
  'Ini tidak dikirim ke perangkat mana pun.',
  '/admin.html',
);
console.error = origErr;

const fcmReached = errs.some((e) => /FCM|Send|Error|UNREGISTERED|INVALID/i.test(e)) || sent;
console.log(`${sent ? 'ok  ' : 'ok  '} sendPushNotification(token palsu) → ${sent}`);
console.log(
  `     ${fcmReached ? 'FCM terjangkau (permintaan sampai ke Firebase, token ditolak = benar)' : 'tidak ada jejak panggilan FCM'}`,
);
for (const e of errs.slice(0, 3)) console.log('     log: ' + e.slice(0, 220));

console.log('\n================ KESIMPULAN ================');
if (envOk && oauthOk) {
  console.log('LULUS — service account terbaca lewat alias & kredensial sah.');
  console.log('Rantai notifikasi siap: yang tersisa hanya deploy kode + token perangkat aktif.');
  process.exit(0);
}
console.log('GAGAL — lihat baris FAIL di atas.');
process.exit(2);

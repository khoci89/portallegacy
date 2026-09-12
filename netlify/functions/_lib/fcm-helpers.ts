import { supabaseJson } from './db/client.ts';
import { env } from './env.ts';
import * as fcm from './fcm-server.ts';

// ===========================================================================
// fcm-helpers.ts — Shared helper untuk notifikasi FCM push
// Dipakai oleh actions-upload.ts, actions-schedule.ts, dll.
// ===========================================================================

// Diagnostik: dulu notifikasi yang tidak terkirim hilang tanpa jejak sama
// sekali, sehingga "notif tidak keluar" sulit dilacak. Log sekali per instance
// (bukan per request) supaya tidak membanjiri log Netlify.
const _warned = new Set<string>();
function warnOnce(msg: string): void {
  if (_warned.has(msg)) return;
  _warned.add(msg);
  console.warn(msg);
}

/** Format WA kandidat: 628xxxxxxxxxx (12–14 digit). */
const KANDIDAT_WA_RE = /^628\d{9,11}$/;

/**
 * Normalisasi nomor telepon ke format 628… (hanya digit).
 * Menangani: 08xx…, 8xx…, 008xx… (awalan internasional), +62 8xx-xxxx.
 * Contoh: "082130442661" → "6282130442661"; "0082229020129" → "6282229020129".
 */
export function normPhone(raw: unknown): string {
  let s = String(raw ?? '').replace(/\D/g, '');
  if (s.startsWith('00')) s = s.slice(2);
  if (s.startsWith('0')) s = '62' + s.slice(1);
  else if (s.startsWith('8')) s = '62' + s;
  return s;
}

/**
 * Nomor admin dari env ADMIN_NUMBERS (mis. "0821…,0082…") → Set format 628…
 * Dipakai supaya admin yang mendaftarkan notifikasi memakai NOMOR HP tetap
 * dikenali sebagai admin, bukan salah kelas jadi token kandidat.
 */
export function adminNumbersFromEnv(raw: unknown): Set<string> {
  const out = new Set<string>();
  for (const part of String(raw ?? '').split(/[,;\s]+/)) {
    const n = normPhone(part);
    // Nomor Indonesia yang masuk akal (62 + 9–12 digit).
    if (/^628\d{8,11}$/.test(n)) out.add(n);
  }
  return out;
}

/**
 * Klasifikasi satu baris fcm_tokens: token ADMIN atau bukan.
 *
 * Riwayat bug (2026-09-12, terverifikasi di tabel produksi): dulu sebuah token
 * dianggap admin HANYA bila `wa` TIDAK cocok /^628\d{9,11}$/. Di produksi ada
 * 10 baris dengan wa = "6282130442661" — itu NOMOR ADMIN (terdaftar di
 * ADMIN_NUMBERS sebagai 082130442661) — sehingga salah kelas jadi token
 * kandidat dan admin tersebut tidak pernah menerima notifikasi admin.
 * Sekarang: nomor yang terdaftar di ADMIN_NUMBERS selalu dianggap admin.
 */
export function isAdminTokenRow(wa: unknown, adminNumbers: Set<string>): boolean {
  const raw = String(wa ?? '');
  if (!raw) return true; // token tanpa WA → token admin / test
  if (adminNumbers.has(normPhone(raw))) return true; // nomor admin terdaftar
  return !KANDIDAT_WA_RE.test(raw); // selain format WA kandidat → admin
}

/**
 * Ambil semua token admin dari fcm_tokens (ter-dedupe).
 * Admin = wa kosong, wa bukan format kandidat (628xxxxxxxxxx), ATAU wa
 * terdaftar sebagai nomor admin di env ADMIN_NUMBERS.
 */
export async function getAdminTokens(): Promise<string[]> {
  try {
    const rows = (await supabaseJson('GET', 'fcm_tokens', {
      query: { select: 'token,wa', limit: 500 },
    })) as any[];
    if (!Array.isArray(rows)) return [];
    const admins = adminNumbersFromEnv(env('ADMIN_NUMBERS'));
    const tokens = rows
      .filter((t) => isAdminTokenRow(t && t.wa, admins))
      .map((t) => String(t && t.token ? t.token : ''))
      .filter(Boolean);
    // Dedupe: satu token yang tersimpan berkali-kali tidak boleh mengirim
    // notifikasi berulang ke perangkat yang sama.
    return [...new Set(tokens)];
  } catch {
    return [];
  }
}

/**
 * Ambil semua token kandidat berdasarkan WA (bisa multiple device).
 */
export async function getKandidatTokens(wa: string): Promise<string[]> {
  try {
    // WA kandidat dinormalisasi ke 628… (kolom fcm_tokens menyimpan format itu).
    const key = normPhone(wa) || String(wa || '');
    const rows = (await supabaseJson('GET', 'fcm_tokens', {
      query: { select: 'token', wa: 'eq.' + key, limit: 20 },
    })) as any[];
    if (!Array.isArray(rows)) return [];
    return [...new Set(rows.map((t) => t && t.token).filter(Boolean))] as string[];
  } catch {
    return [];
  }
}

/**
 * Kirim notifikasi ke semua admin — fire-and-forget.
 * Error diam-diam (tidak membatalkan operasi pemanggil).
 */
export async function notifyAdmins(title: string, body: string, url = '/'): Promise<void> {
  try {
    const tokens = await getAdminTokens();
    if (tokens.length === 0) {
      // Penyebab umum: admin belum pernah menyetujui izin notifikasi (token
      // tidak pernah tersimpan di fcm_tokens), atau nama admin tersimpan
      // sebagai nomor WA (628…) sehingga salah kelas jadi token kandidat.
      warnOnce(
        '[FCM] Tidak ada token admin di fcm_tokens — notifikasi admin di-skip. ' +
          'Minta admin login lalu setujui izin notifikasi di HP/browser.',
      );
      return;
    }
    await fcm.sendMulticast(tokens, title, body, url);
  } catch (e) {
    // best-effort — notif gagal jangan ganggu flow utama, tapi jangan senyap.
    warnOnce('[FCM] notifyAdmins gagal: ' + (e && e.message ? e.message : e));
  }
}

/**
 * Kirim notifikasi ke kandidat tertentu (semua device) — fire-and-forget.
 */
export async function notifyKandidat(
  wa: string,
  title: string,
  body: string,
  url = '/',
): Promise<void> {
  try {
    const tokens = await getKandidatTokens(wa);
    if (tokens.length === 0) return;
    await fcm.sendMulticast(tokens, title, body, url);
  } catch {
    // best-effort
  }
}

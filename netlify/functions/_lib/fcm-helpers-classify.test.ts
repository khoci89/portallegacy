// ==========================================
// REGRESSION TEST — klasifikasi token admin di fcm_tokens.
//
// Bug nyata (2026-09-12, terverifikasi di tabel produksi `fcm_tokens`):
// 52 baris token; 20 di antaranya wa="KHOCI" (nama admin) dan 10 baris
// wa="6282130442661" — nomor yang TERDAFTAR di ADMIN_NUMBERS (082130442661).
//
// Aturan lama: token dianggap admin hanya bila `wa` TIDAK cocok
// /^628\d{9,11}$/. Jadi 10 token nomor admin itu salah kelas jadi token
// KANDIDAT → admin tersebut tidak pernah menerima notifikasi admin.
// ==========================================
import { describe, it, expect } from 'vitest';
import { normPhone, adminNumbersFromEnv, isAdminTokenRow } from './fcm-helpers';

// Nilai asli dari env ADMIN_NUMBERS di produksi.
const ADMIN_NUMBERS_RAW = '082130442661,0082229020129,087864932711,087728149733,087889502004';

describe('normPhone', () => {
  it('menormalkan awalan 0 ke 62', () => {
    expect(normPhone('082130442661')).toBe('6282130442661');
  });
  it('menormalkan awalan 8 polos', () => {
    expect(normPhone('82130442661')).toBe('6282130442661');
  });
  it('menormalkan awalan internasional 00', () => {
    expect(normPhone('0082229020129')).toBe('6282229020129');
  });
  it('membuang pemisah +62 812-3456', () => {
    expect(normPhone('+62 812-3456')).toBe('628123456');
  });
  it('nama admin (bukan angka) → kosong', () => {
    expect(normPhone('KHOCI')).toBe('');
  });
});

describe('adminNumbersFromEnv', () => {
  it('mengubah daftar env produksi menjadi Set format 628…', () => {
    const s = adminNumbersFromEnv(ADMIN_NUMBERS_RAW);
    expect(s.has('6282130442661')).toBe(true);
    expect(s.has('6282229020129')).toBe(true);
    expect(s.has('6287864932711')).toBe(true);
    expect(s.has('6287728149733')).toBe(true);
    expect(s.has('6287889502004')).toBe(true);
    expect(s.size).toBe(5);
  });
  it('mengabaikan entri sampah / terlalu pendek', () => {
    expect(adminNumbersFromEnv('123,,abc,  ,0878').size).toBe(0);
  });
  it('menerima pemisah koma, titik-koma, dan spasi', () => {
    expect(adminNumbersFromEnv('082130442661; 087864932711 087728149733').size).toBe(3);
  });
});

describe('isAdminTokenRow — kasus nyata dari tabel produksi', () => {
  const admins = adminNumbersFromEnv(ADMIN_NUMBERS_RAW);

  it('wa="KHOCI" (nama admin) → ADMIN', () => {
    expect(isAdminTokenRow('KHOCI', admins)).toBe(true);
  });

  it('wa="6282130442661" (NOMOR ADMIN) → ADMIN — dulu salah kelas jadi kandidat', () => {
    expect(isAdminTokenRow('6282130442661', admins)).toBe(true);
  });

  it('wa nomor admin dalam format mentah 0… → ADMIN', () => {
    expect(isAdminTokenRow('082130442661', admins)).toBe(true);
  });

  it('wa kandidat biasa → BUKAN admin', () => {
    expect(isAdminTokenRow('6285748436755', admins)).toBe(false);
    expect(isAdminTokenRow('628978692662', admins)).toBe(false);
  });

  it('wa kosong → ADMIN (token test / token lama tanpa WA)', () => {
    expect(isAdminTokenRow('', admins)).toBe(true);
    expect(isAdminTokenRow(null, admins)).toBe(true);
  });

  it('token dummy 6280000000000 / 6281234567890 tetap bukan admin', () => {
    expect(isAdminTokenRow('6280000000000', admins)).toBe(false);
    expect(isAdminTokenRow('6281234567890', admins)).toBe(false);
  });
});

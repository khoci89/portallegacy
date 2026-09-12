// ==========================================
// REGRESSION TEST — env() harus membaca ALIAS nama variabel saat runtime.
//
// Bug nyata (2026-09-12, terverifikasi lewat Netlify API): service account
// Firebase terpasang di Netlify dengan nama **FIREBASE_SERVICE_TOKEN**
// (JSON valid, 2372 char, project khoci-7a81c), sedangkan kode membaca
// **FIREBASE_SERVICE_ACCOUNT**. `process.env['FIREBASE_SERVICE_ACCOUNT']`
// undefined → env() kosong → sendPushNotification() return false →
// SEMUA push notification mati total tanpa error di log.
//
// Test ini GAGAL di kode lama (alias belum ada).
// ==========================================
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { env } from './env';

const CANON = 'FIREBASE_SERVICE_ACCOUNT';
const ALIAS = 'FIREBASE_SERVICE_TOKEN';

const saved: Record<string, string | undefined> = {};

function stash(...keys: string[]) {
  for (const k of keys) saved[k] = process.env[k];
}
function restore() {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe('env() — alias nama variabel (FIREBASE_SERVICE_TOKEN)', () => {
  beforeEach(() => stash(CANON, ALIAS));
  afterEach(restore);

  it('membaca FIREBASE_SERVICE_TOKEN saat FIREBASE_SERVICE_ACCOUNT tidak ada', () => {
    delete process.env[CANON];
    process.env[ALIAS] = '{"project_id":"khoci-7a81c"}';
    expect(env(CANON)).toBe('{"project_id":"khoci-7a81c"}');
  });

  it('nama baku tetap menang kalau keduanya terpasang', () => {
    process.env[CANON] = '{"from":"canonical"}';
    process.env[ALIAS] = '{"from":"alias"}';
    expect(env(CANON)).toBe('{"from":"canonical"}');
  });

  it('nama baku kosong ("") → jatuh ke alias, bukan dianggap terisi', () => {
    process.env[CANON] = '';
    process.env[ALIAS] = '{"from":"alias"}';
    expect(env(CANON)).toBe('{"from":"alias"}');
  });

  it('keduanya kosong → string kosong (tanpa alias palsu)', () => {
    delete process.env[CANON];
    delete process.env[ALIAS];
    // .env.local repo ini memang tidak memuat service account Firebase.
    expect(env(CANON)).toBe('');
  });

  it('alias tidak bocor ke key lain', () => {
    delete process.env[CANON];
    process.env[ALIAS] = '{"project_id":"x"}';
    expect(env('SUPABASE_URL')).not.toBe('{"project_id":"x"}');
  });
});

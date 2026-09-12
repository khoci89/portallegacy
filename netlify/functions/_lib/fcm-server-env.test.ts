// ==========================================
// REGRESSION TEST — fcm-server WAJIB membaca FIREBASE_SERVICE_ACCOUNT lewat
// helper env() (fallback .env.local / Netlify env), bukan process.env langsung.
//
// Bug nyata (2026-09-12): fcm-server.ts memakai `process.env.FIREBASE_SERVICE_ACCOUNT`
// sehingga kunci yang dipasang lewat Keys UI / .env.local tidak pernah terbaca —
// SEMUA push notification gagal diam-diam (return false tanpa log).
// Test ini gagal di kode lama.
// ==========================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const fakeServiceAccount = JSON.stringify({
  client_email: 'fcm-test@proyek-test.iam.gserviceaccount.com',
  private_key: privateKey,
  project_id: 'proyek-test',
});

let envValue = fakeServiceAccount;
vi.mock('./env.js', () => ({
  env: (key: string) => (key === 'FIREBASE_SERVICE_ACCOUNT' ? envValue : ''),
}));

import { sendPushNotification } from './fcm-server';

describe('fcm-server — sumber FIREBASE_SERVICE_ACCOUNT', () => {
  beforeEach(() => {
    envValue = fakeServiceAccount;
  });

  it('memakai service account dari helper env() → benar-benar memanggil FCM', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: any) => {
      calls.push(String(url));
      if (String(url).includes('oauth2.googleapis.com')) {
        return { ok: true, json: async () => ({ access_token: 'tok-test', expires_in: 3600 }) };
      }
      return { ok: true, json: async () => ({ name: 'projects/proyek-test/messages/1' }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const ok = await sendPushNotification('token-abc', 'Judul', 'Isi', '/admin.html');

    expect(ok).toBe(true);
    expect(calls.some((u) => u.includes('oauth2.googleapis.com'))).toBe(true);
    expect(calls.some((u) => u.includes('/v1/projects/proyek-test/messages:send'))).toBe(true);

    vi.unstubAllGlobals();
  });

  it('env kosong → return false dan TIDAK memanggil jaringan', async () => {
    envValue = '';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const ok = await sendPushNotification('token-abc', 'Judul', 'Isi', '/');

    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

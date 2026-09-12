// ==========================================
// REGRESSION TEST — syncBiodataKeMail: push notif admin TIDAK boleh bergantung
// pada ada/tidaknya baris lamaran di database_asj_form.
//
// Bug nyata (2026-09-12): blok notifyAdmins berada SETELAH
// `if (!mine.length) return;` sehingga kandidat yang belum punya lamaran
// (belum apply / belum upload dokumen) update biodata tanpa memicu notifikasi
// apa pun ke admin. Test ini gagal di kode lama.
// ==========================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

const notifyAdmins = vi.fn().mockResolvedValue(undefined);
vi.mock('./fcm-helpers.js', () => ({
  notifyAdmins: (...args: any[]) => notifyAdmins(...args),
}));

vi.mock('./fcm-server.js', () => ({
  sendMulticast: vi.fn().mockResolvedValue(undefined),
}));

let supabaseCalls: any[] = [];
vi.mock('./db/client.js', () => ({
  supabaseJson: (...args: any[]) => {
    supabaseCalls.push(args);
    return Promise.resolve([]);
  },
  supabaseUpsert: vi.fn().mockResolvedValue(undefined),
  normalizeWa: (s: any) => String(s || '').replace(/\D/g, ''),
  toText: (v: any) => (v == null ? '' : String(v)),
  pick: (row: any, keys: string[]) => {
    for (const k of keys)
      if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    return null;
  },
}));

let formsByWa: any[] | undefined = [];
vi.mock('./db/forms.js', () => ({
  findForms: vi.fn().mockResolvedValue([]),
  findFormsByWa: () => Promise.resolve(formsByWa),
  mapForm: (f: any) => f,
  resolveForm: vi.fn(),
  upsertFormRow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./db/candidates.js', () => ({ mapCandidate: (r: any) => r }));
vi.mock('./db/berkas.js', () => ({ attachBerkasBio: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./actions-auth.js', () => ({ requireAdmin: () => ({ token: { role: 'admin' } }) }));
vi.mock('./candidate-helpers.js', () => ({
  findCandidateByWa: vi.fn().mockResolvedValue(null),
  nextCandidateId: vi.fn().mockResolvedValue('ASJ-1'),
}));
vi.mock('./actions-public.js', () => ({ stripRaw: (rows: any[]) => rows }));
vi.mock('./cache.js', () => ({ cacheClear: vi.fn() }));

import { syncBiodataKeMail } from './actions-mail';

const WA = '6281234567890';

describe('syncBiodataKeMail — push notif admin tidak bergantung baris lamaran', () => {
  beforeEach(() => {
    notifyAdmins.mockClear();
    supabaseCalls = [];
  });

  it('kirim notif walau kandidat BELUM punya baris lamaran (kode lama: tidak kirim)', async () => {
    formsByWa = [];

    await syncBiodataKeMail(WA, 'BUDI', ['email', 'alamat']);

    expect(notifyAdmins).toHaveBeenCalledTimes(1);
    expect(notifyAdmins.mock.calls[0][0]).toBe('Biodata Lengkap (CV) Diperbarui');
    expect(String(notifyAdmins.mock.calls[0][1])).toContain('BUDI');
    expect(String(notifyAdmins.mock.calls[0][1])).toContain('email, alamat');
    expect(notifyAdmins.mock.calls[0][2]).toBe('/admin.html');
  });

  it('tanpa label perubahan → tidak ada notif (hindari spam)', async () => {
    formsByWa = [];

    await syncBiodataKeMail(WA, 'BUDI', []);

    expect(notifyAdmins).not.toHaveBeenCalled();
  });

  it('tetap kirim notif + tandai baris mail UPDATE saat lamaran sudah diproses', async () => {
    formsByWa = [{ id: 7, no_wa: WA, status: 'LULUS', feedback_berkas: '' }];

    await syncBiodataKeMail(WA, 'BUDI', ['email']);

    expect(notifyAdmins).toHaveBeenCalledTimes(1);
    const patch = supabaseCalls.find((c) => c[0] === 'PATCH' && c[1] === 'database_asj_form');
    expect(patch).toBeTruthy();
    expect(patch[2].query.id).toBe('eq.7');
    expect(patch[2].body.status).toBe('UPDATE');
    expect(String(patch[2].body.feedback_berkas)).toContain('[BIODATA] email');
  });
});

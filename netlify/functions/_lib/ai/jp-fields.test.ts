// ==========================================
// TESTS: jp-fields — registry tunggal pasangan bilingual (ID→JP).
// Menjaga chat.ts (AI_ID_JP_PAIRS) dan actions-master.ts (JP_TRANSLATE_MAP)
// tetap selaras: kedua konsumen menurunkan vocab dari SATU daftar ini, dan
// tes ini mengunci bentuknya supaya perubahan yang tidak disengaja (field
// hilang, kolom JP berubah, key form dobel) terdeteksi.
// ==========================================
import { describe, it, expect } from 'vitest';
import { JP_FIELD_PAIRS, ARRAY_FIELD_PAIRS } from './jp-fields';

// Proyeksi actions-master: form key → kolom DB JP (dulu JP_TRANSLATE_MAP
// hardcoded 16 entri di actions-master.ts).
function deriveTranslateMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of JP_FIELD_PAIRS) {
    if (pair.formKey && pair.jpCol) map[pair.formKey] = pair.jpCol;
  }
  return map;
}

// Proyeksi chat: path nested id→jp (dulu AI_ID_JP_PAIRS 24 entri di chat.ts).
function deriveNestedPairs(): Array<{ idPath: string[]; jpPath: string[] }> {
  return JP_FIELD_PAIRS.map((p) => ({ idPath: p.idPath, jpPath: p.jpPath }));
}

describe('JP_FIELD_PAIRS — registry tunggal bilingual', () => {
  it('memuat 25 pasangan nested (24 lama + riwayat_jepang, kontrak AI_ID_JP_PAIRS chat.ts)', () => {
    const pairs = deriveNestedPairs();
    expect(pairs).toHaveLength(25);
    for (const p of pairs) {
      expect(p.idPath.length).toBeGreaterThan(0);
      expect(p.jpPath.length).toBe(p.idPath.length);
      // Setiap pasangan harus id→jp yang sepadan (prefix sama, akhiran beda).
      expect(p.jpPath[p.jpPath.length - 1]).toMatch(/_jp$/);
      expect(p.idPath[p.idPath.length - 1]).not.toMatch(/_jp$/);
    }
  });

  it('riwayat_jepang ada di registry (kolom JP-nya ikut diterjemahkan, tanpa kolom master)', () => {
    const pair = JP_FIELD_PAIRS.find(
      (p) => p.idPath.join('.') === 'wawancara.riwayat_jepang',
    );
    expect(pair).toBeTruthy();
    expect(pair!.jpPath.join('.')).toBe('wawancara.riwayat_jepang_jp');
    // Nilainya hidup di ai_data_json (bukan tabel master) → tidak punya formKey.
    expect(pair!.formKey).toBeUndefined();
    expect(pair!.jpCol).toBeUndefined();
  });

  it('menurunkan JP_TRANSLATE_MAP persis 16 entri (kontrak lama actions-master.ts)', () => {
    const map = deriveTranslateMap();
    expect(Object.keys(map).sort()).toEqual(
      [
        'agama',
        'alasanBidang',
        'alergi',
        'alamat',
        'hobi',
        'keahlianKhusus',
        'kelebihan',
        'keinginan',
        'kekurangan',
        'laka',
        'motivasiJepang',
        'penyakit',
        'promosi',
        'rencanaPulang',
        'tempatLahir',
        'tujuanJepang',
      ].sort(),
    );
    // Spot-check kolom JP (kontrak lama).
    expect(map.promosi).toBe('promosi_diri_jp');
    expect(map.kelebihan).toBe('kelebihan_jp');
    expect(map.penyakit).toBe('riwayat_medis_jp');
    expect(map.alasanBidang).toBe('alasan_memilih_bidang_jp');
    expect(map.tujuanJepang).toBe('tujuan_ke_jepang_jp');
  });

  it('setiap formKey punya jpCol & sebaliknya; tidak ada formKey dobel', () => {
    const seen = new Set<string>();
    for (const pair of JP_FIELD_PAIRS) {
      expect(Boolean(pair.formKey) === Boolean(pair.jpCol)).toBe(true);
      if (pair.formKey) {
        expect(seen.has(pair.formKey)).toBe(false);
        seen.add(pair.formKey);
      }
    }
  });

  it('ARRAY_FIELD_PAIRS memuat 6 pasangan array (kontrak chat.ts)', () => {
    expect(ARRAY_FIELD_PAIRS).toHaveLength(6);
    const types = ARRAY_FIELD_PAIRS.map((a) => a.type);
    expect(types.filter((t) => t === 'pendidikan')).toHaveLength(2);
    expect(types.filter((t) => t === 'pekerjaan')).toHaveLength(2);
    expect(types.filter((t) => t === 'keluarga')).toHaveLength(2);
    for (const a of ARRAY_FIELD_PAIRS) {
      expect(a.jpKey).toMatch(/_jp$/);
      expect(a.idKey).not.toMatch(/_jp$/);
    }
  });
});
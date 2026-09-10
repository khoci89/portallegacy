// TESTS: js/silsilah.ts — registry silsilah & snap nilai (SATU SUMBER untuk
// dropdown form AI & prompt sistem Qween Jeklin).
import { describe, it, expect } from 'vitest';
import {
  KELUARGA_PAIRS,
  PEKERJAAN_PAIRS,
  JABATAN_PAIRS,
  KENALAN_PAIRS,
  GENDER_PAIRS,
  pairJpOf,
  pairIdOf,
  snapId,
} from './silsilah.ts';

describe('registry — pasangan ID↔kanji lengkap & unik', () => {
  it('keluarga memuat silsilah dengan gender eksplisit', () => {
    const ids = KELUARGA_PAIRS.map((p) => p[0]);
    expect(ids).toContain('AYAH');
    expect(ids).toContain('IBU');
    expect(ids).toContain('KAKAK LAKI-LAKI');
    expect(ids).toContain('KAKAK PEREMPUAN');
    expect(ids).toContain('ADIK LAKI-LAKI');
    expect(ids).toContain('ADIK PEREMPUAN');
    expect(ids).toContain('ANAK LAKI-LAKI');
    expect(ids).toContain('CUCU PEREMPUAN');
    // Tidak ada lagi generik lama KAKAK/ADIK tanpa gender
    expect(ids).not.toContain('KAKAK');
    expect(ids).not.toContain('ADIK');
  });

  it('kanji pasangan eksak (silsilah Jepang standar)', () => {
    expect(pairJpOf(KELUARGA_PAIRS, 'AYAH')).toBe('父');
    expect(pairJpOf(KELUARGA_PAIRS, 'KAKAK LAKI-LAKI')).toBe('兄');
    expect(pairJpOf(KELUARGA_PAIRS, 'KAKAK PEREMPUAN')).toBe('姉');
    expect(pairJpOf(KELUARGA_PAIRS, 'ADIK LAKI-LAKI')).toBe('弟');
    expect(pairJpOf(KELUARGA_PAIRS, 'ADIK PEREMPUAN')).toBe('妹');
    expect(pairJpOf(KELUARGA_PAIRS, 'ANAK LAKI-LAKI')).toBe('息子');
  });

  it('ID unik di tiap registry (tidak ada duplikat)', () => {
    for (const pairs of [KELUARGA_PAIRS, PEKERJAAN_PAIRS, JABATAN_PAIRS, KENALAN_PAIRS, GENDER_PAIRS]) {
      const ids = pairs.map((p) => p[0]);
      expect(new Set(ids).size).toBe(ids.length);
      const jps = pairs.map((p) => p[1]);
      expect(new Set(jps).size).toBe(jps.length);
    }
  });

  it('nilai tersimpan UPPERCASE semua (kontrak master)', () => {
    for (const pairs of [KELUARGA_PAIRS, PEKERJAAN_PAIRS, JABATAN_PAIRS, KENALAN_PAIRS]) {
      for (const [id] of pairs) expect(id).toBe(id.toUpperCase());
    }
  });
});

describe('pairJpOf / pairIdOf — pencarian dua arah', () => {
  it('ID → kanji (toleran case & spasi)', () => {
    expect(pairJpOf(KELUARGA_PAIRS, 'kakak laki-laki')).toBe('兄');
    expect(pairJpOf(KELUARGA_PAIRS, 'KAKAK  LAKI - LAKI')).toBe('兄');
    expect(pairJpOf(PEKERJAAN_PAIRS, 'Tukang Bangunan')).toBe('建設作業員');
  });

  it('kanji → ID (balik arah)', () => {
    expect(pairIdOf(KELUARGA_PAIRS, '兄')).toBe('KAKAK LAKI-LAKI');
    expect(pairIdOf(PEKERJAAN_PAIRS, '主婦')).toBe('IBU RUMAH TANGGA');
  });

  it('nilai asing → string kosong', () => {
    expect(pairJpOf(KELUARGA_PAIRS, 'SEPUPU')).toBe('');
    expect(pairIdOf(KELUARGA_PAIRS, '未知')).toBe('');
    expect(pairJpOf(KELUARGA_PAIRS, '')).toBe('');
  });
});

describe('snapId — normalisasi nilai bebas ke registry', () => {
  it('tingkat 1: cocok persis (normalisasi format)', () => {
    expect(snapId(KELUARGA_PAIRS, 'kakak laki-laki')).toBe('KAKAK LAKI-LAKI');
    expect(snapId(GENDER_PAIRS, 'laki-laki')).toBe('LAKI-LAKI');
  });

  it('tingkat 2: alias umum (slang/bahasa sehari-hari)', () => {
    expect(snapId(KELUARGA_PAIRS, 'om')).toBe('AYAH');
    expect(snapId(KELUARGA_PAIRS, 'Mama')).toBe('IBU');
    expect(snapId(KELUARGA_PAIRS, 'ponakan')).toBe('KEPONAKAN');
    expect(snapId(GENDER_PAIRS, 'cowok')).toBe('LAKI-LAKI');
    expect(snapId(GENDER_PAIRS, 'cewek')).toBe('PEREMPUAN');
    expect(snapId(GENDER_PAIRS, 'pria')).toBe('LAKI-LAKI');
  });

  it('tingkat 3: angka-ganda gaya chat (laki2 → LAKI-LAKI)', () => {
    expect(snapId(KELUARGA_PAIRS, 'kakak laki2')).toBe('KAKAK LAKI-LAKI');
    expect(snapId(KELUARGA_PAIRS, 'adik perempuan2')).toBe('ADIK PEREMPUAN');
  });

  it('tingkat 4: susunan dasar + gender sehari-hari (kakak cowok)', () => {
    expect(snapId(KELUARGA_PAIRS, 'kakak cowok')).toBe('KAKAK LAKI-LAKI');
    expect(snapId(KELUARGA_PAIRS, 'adek cewek')).toBe('ADIK PEREMPUAN');
    expect(snapId(KELUARGA_PAIRS, 'anak laki')).toBe('ANAK LAKI-LAKI');
  });

  it('tingkat 5: prefiks kompak ber-gender (kakaklaki)', () => {
    expect(snapId(KELUARGA_PAIRS, 'kakaklaki')).toBe('KAKAK LAKI-LAKI');
    expect(snapId(KELUARGA_PAIRS, 'adikpr')).toBe('ADIK PEREMPUAN');
  });

  it('nilai generik TANPA gender TIDAK menebak (wajib ditanyakan AI)', () => {
    // "kakak"/"adik" saja → tidak boleh di-snap ke salah satu gender
    expect(snapId(KELUARGA_PAIRS, 'kakak')).toBe('');
    expect(snapId(KELUARGA_PAIRS, 'adik')).toBe('');
    expect(snapId(KELUARGA_PAIRS, 'anak')).toBe('');
  });

  it('nilai di luar registry → kosong (pemanggil memutuskan)', () => {
    expect(snapId(KELUARGA_PAIRS, 'sepupu jauh')).toBe('');
    expect(snapId(PEKERJAAN_PAIRS, 'astronot')).toBe('');
  });

  it('pekerjaan: snap variasi penulisan', () => {
    expect(snapId(PEKERJAAN_PAIRS, 'tukang bangunan')).toBe('TUKANG BANGUNAN');
    expect(snapId(PEKERJAAN_PAIRS, 'IBU RUMAH TANGGA ')).toBe('IBU RUMAH TANGGA');
  });
});

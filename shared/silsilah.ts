// =============================================================================
// js/silsilah.ts — REGISTRY SILSILAH & PASANGAN ID↔KANJI (SATU SUMBER)
// -----------------------------------------------------------------------------
// 2026-09-10: Satu registry untuk (a) dropdown berpasangan di form AI
// (js/pages/ai_form.ts) dan (b) prompt sistem Qween Jeklin (Netlify
// functions → ai/chat.ts) supaya AI mengembalikan nilai yang PERSIS sama
// dengan opsi dropdown — tidak pernah drift lagi (filosofi "SATU registry",
// sama seperti jp-fields.ts untuk pasangan ID/JP field).
//
// File ini ESM murni tanpa import dan tanpa DOM — aman:
//   - di-bundle esbuild ke halaman standalone (js/pages/ai_form.ts)
//   - di-import langsung oleh netlify functions (node runtime, ai/chat.ts)
//   - di-import oleh unit test vitest
//
// Bentuk pasangan: [id, jp] — id SELALU uppercase (nilai tersimpan master),
// jp kanji (opsional + romaji/keterangan dalam label dropdown).
// =============================================================================

// --- KELUARGA: silsilah lengkap dengan gender & kanji eksak ----------------
export const KELUARGA_PAIRS: Array<[string, string]> = [
  ['AYAH', '父'],
  ['IBU', '母'],
  ['SUAMI', '夫'],
  ['ISTRI', '妻'],
  ['ANAK LAKI-LAKI', '息子'],
  ['ANAK PEREMPUAN', '娘'],
  ['KAKAK LAKI-LAKI', '兄'],
  ['KAKAK PEREMPUAN', '姉'],
  ['ADIK LAKI-LAKI', '弟'],
  ['ADIK PEREMPUAN', '妹'],
  ['KAKEK', '祖父'],
  ['NENEK', '祖母'],
  ['MERTUA LAKI-LAKI', '義父'],
  ['MERTUA PEREMPUAN', '義母'],
  ['IPAR LAKI-LAKI', '義兄'],
  ['IPAR PEREMPUAN', '義姉'],
  ['KEPONAKAN', '甥・姪'],
  ['CUCU LAKI-LAKI', '孫息子'],
  ['CUCU PEREMPUAN', '孫娘'],
];

// --- PEKERJAAN keluarga/kenalan: pasangan ID↔kanji --------------------------
export const PEKERJAAN_PAIRS: Array<[string, string]> = [
  ['PETANI / PERKEBUNAN', '農業'],
  ['IBU RUMAH TANGGA', '主婦'],
  ['NELAYAN', '漁師'],
  ['BURUH PABRIK', '工場労働者'],
  ['KARYAWAN SWASTA', '会社員'],
  ['PEGAWAI TOKO', '店員'],
  ['GURU / PENGAJAR', '教師'],
  ['PERAWAT', '看護師'],
  ['MEKANIK', '整備士'],
  ['TEKNISI', '技術者'],
  ['WELDER / LAS', '溶接工'],
  ['TUKANG BANGUNAN', '建設作業員'],
  ['OPERATOR PRODUKSI', '工場作業員'],
  ['ADMIN / STAFF ADMIN', '事務員'],
  ['SALES / MARKETING', '営業'],
  ['KASIR', 'レジ係'],
  ['KOKI / CHEF', '調理師'],
  ['PELAYAN / WAITER', 'ウェイター'],
  ['CLEANING SERVICE', '清掃員'],
  ['SATPAM / SECURITY', '警備員'],
  ['SOPIR / DRIVER', '運転手'],
  ['RESEPSIONIS', '受付'],
  ['BARISTA', 'バリスタ'],
  ['PELAJAR / MAHASISWA', '学生'],
  ['BELUM BEKERJA', '無職'],
  ['PENSIUN', '退職者'],
];

// --- JABATAN pekerjaan kandidat: pasangan ID↔kanji --------------------------
export const JABATAN_PAIRS: Array<[string, string]> = [
  ['KULI', '作業員'],
  ['OPERATOR PRODUKSI', '工場作業員'],
  ['OPERATOR MESIN', '機械オペレーター'],
  ['QC / QUALITY CONTROL', '品質管理'],
  ['ADMIN', '事務員'],
  ['LEADER', 'リーダー'],
  ['SUPERVISOR', '監督者'],
  ['MEKANIK', '整備士'],
  ['TEKNISI', '技術者'],
  ['WELDER / LAS', '溶接工'],
  ['KOKI / CHEF', '調理師'],
  ['PELAYAN / WAITER', 'ウェイター'],
  ['KASIR', 'レジ係'],
  ['SALES', '営業'],
  ['SOPIR / DRIVER', '運転手'],
  ['TUKANG BANGUNAN', '建設作業員'],
  ['GURU / PENGAJAR', '教師'],
  ['PERAWAT', '看護師'],
];

// --- KENALAN di Jepang: hubungan umum (bukan silsilah murni) ----------------
export const KENALAN_PAIRS: Array<[string, string]> = [
  ['TEMAN', '友達'],
  ['TEMAN KERJA', '同僚'],
  ['MENTOR / GURU', '先生'],
  ['KAKAK LAKI-LAKI', '兄'],
  ['KAKAK PEREMPUAN', '姉'],
  ['ADIK LAKI-LAKI', '弟'],
  ['ADIK PEREMPUAN', '妹'],
  ['PAMAN', '叔父'],
  ['BIBI', '叔母'],
  ['SEPUPU', '従兄弟'],
  ['KAKEK', '祖父'],
  ['NENEK', '祖母'],
  ['IPAR LAKI-LAKI', '義兄'],
  ['IPAR PEREMPUAN', '義姉'],
  ['SUAMI', '夫'],
  ['ISTRI', '妻'],
];

// --- IDENTITAS: gender / agama / status nikah / dll -------------------------
export const GENDER_PAIRS: Array<[string, string]> = [
  ['LAKI-LAKI', '男性'],
  ['PEREMPUAN', '女性'],
];

// --- Pencarian pasangan (toleran format: case, spasi, hubung) ----------------
function normId(v: string): string {
  return String(v || '')
    .trim()
    .toUpperCase()
    .replace(/\s*[-–]\s*/g, '-')
    .replace(/\s+/g, ' ');
}

/** Kanji pasangan untuk satu nilai ID (case-insensitive, toleran format). */
export function pairJpOf(pairs: Array<[string, string]>, idVal: string): string {
  const v = normId(idVal);
  if (!v) return '';
  for (const [id, jp] of pairs) if (normId(id) === v) return jp;
  return '';
}

/** ID pasangan untuk satu nilai JP (persis; kanji tidak punya varian case). */
export function pairIdOf(pairs: Array<[string, string]>, jpVal: string): string {
  const v = String(jpVal || '').trim();
  if (!v) return '';
  for (const [id, jp] of pairs) if (jp === v) return id;
  return '';
}

// ---------------------------------------------------------------------------
// Snap ke registry: terima nilai bebas dari AI/kandidat dan kembalikan nilai
// kanonikal registry bila cocok; '' bila tidak ada padanan (pemanggil
// memutuskan: pakai apa adanya atau biarkan). Dipakai backend (normalisasi
// balasan AI chat) & frontend (draft lama).
//
// Strategi berlapis (dari paling presisi):
//   1. Cocok persis (normalisasi case/spasi/hubung)
//   2. Alias umum (slang/bahasa sehari-hari): "om"→AYAH, "adek"→ADIK, dst
//   3. Angka ganda gaya chat: "laki2"→"laki-laki" (LAKI2→LAKILAKI)
//   4. Susunan kata dasar + gender: "kakak cowok"→KAKAK LAKI-LAKI
//   5. Prefiks kompak untuk kunci ber-gender: "kakaklaki"→KAKAK LAKI-LAKI
// Kunci generik TANPA gender (mis. KEPONAKAN) hanya bisa dicapai lewat 1-3 —
// jangan menebak gender dari nilai generik (prompt AI wajib menanyakan dulu).
// ---------------------------------------------------------------------------
const ID_ALIASES: Record<string, string> = {
  // keluarga
  OM: 'AYAH',
  PAPA: 'AYAH',
  BAPAK: 'AYAH',
  BOKAP: 'AYAH',
  MAMA: 'IBU',
  MAMI: 'IBU',
  BUNDA: 'IBU',
  NYAK: 'IBU',
  ADEK: 'ADIK',
  ADIKKU: 'ADIK',
  KAKANG: 'KAKAK',
  MBAK: 'KAKAK',
  MAS: 'KAKAK',
  ABANG: 'KAKAK',
  BAPAKMERTUA: 'MERTUA LAKI-LAKI',
  MAMAMERTUA: 'MERTUA PEREMPUAN',
  BESAN: 'MERTUA LAKI-LAKI',
  CUCU: 'CUCU LAKI-LAKI',
  PONAKAN: 'KEPONAKAN',
  KEPO: 'KEPONAKAN',
  MINTUO: 'MERTUA LAKI-LAKI',
  // gender
  PRIA: 'LAKI-LAKI',
  COWOK: 'LAKI-LAKI',
  L: 'LAKI-LAKI',
  LK: 'LAKI-LAKI',
  MALE: 'LAKI-LAKI',
  WANITA: 'PEREMPUAN',
  CEWEK: 'PEREMPUAN',
  CEWE: 'PEREMPUAN',
  P: 'PEREMPUAN',
  PR: 'PEREMPUAN',
  FEMALE: 'PEREMPUAN',
};
// Kata dasar relasi yang butuh pasangan gender di registry.
const BASE_GENDERED: Record<string, string> = {
  KAKAK: 'KAKAK',
  ADIK: 'ADIK',
  ADEK: 'ADIK', // ejaan sehari-hari
  ANAK: 'ANAK',
  CUCU: 'CUCU',
  MERTUA: 'MERTUA',
  IPAR: 'IPAR',
};
// Petunjuk gender dalam bahasa sehari-hari.
const HINT_LAKI = new Set(['LAKI', 'LAKILAKI', 'COWOK', 'COWO', 'LAKIL', 'PRIA', 'LK']);
const HINT_PEREMPUAN = new Set(['PEREMPUAN', 'WANITA', 'CEWEK', 'CEWE', 'PR', 'P']);
// Singkatan konvensional (bukan prefiks): "PR"≠awalan PEREMPUAN, "LK"≠awalan
// LAKILAKI — mereka disnap lewat tabel ini di dekomposisi kompak.
const GENDER_ABBR: Record<string, string> = {
  PR: 'PEREMPUAN',
  PRIA: 'LAKI-LAKI',
  WANITA: 'PEREMPUAN',
  LK: 'LAKI-LAKI',
};

function compactAlnum(s: string): string {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// "LAKI2" → "LAKILAKI" (gaya chat: angka = kata digandakan).
function expandDoubled(s: string): string {
  return String(s || '').toUpperCase().replace(/([A-Z]+?)2/g, '$1$1');
}

export function snapId(pairs: Array<[string, string]>, raw: string): string {
  const v = normId(raw);
  if (!v) return '';
  // 1) Cocok persis
  for (const [id] of pairs) if (normId(id) === v) return id;
  // 2) Alias umum (termasuk hasil expand angka-ganda)
  const vExp = expandDoubled(v);
  const vCompact = compactAlnum(vExp);
  const alias = ID_ALIASES[v] || ID_ALIASES[vExp] || ID_ALIASES[vCompact];
  if (alias) {
    for (const [id] of pairs) if (normId(id) === alias) return id;
  }
  // 3+4) Susun dari kata dasar + gender: "kakak cowok" → KAKAK LAKI-LAKI
  const tokens = vExp.split(/[^A-Z0-9]+/).filter(Boolean);
  let base = '';
  let gender = '';
  for (const t of tokens) {
    const b = BASE_GENDERED[t];
    if (b) base = b;
    else {
      // Hint gender: exact ATAU kata berawalan hint (hasil angka-ganda seperti
      // 'PEREMPUANPEREMPUAN' dari 'perempuan2' tetap dikenali).
      for (const h of HINT_LAKI) if (h.length >= 3 && t.startsWith(h)) gender = 'LAKI-LAKI';
      for (const h of HINT_PEREMPUAN) if (h.length >= 3 && t.startsWith(h)) gender = 'PEREMPUAN';
    }
  }
  if (base && gender) {
    const composed = base + ' ' + gender;
    for (const [id] of pairs) if (normId(id) === composed) return id;
  }
  // 5) Dekomposisi kompak: vCompact = kata dasar + (awalan) gender.
  //    'kakaklaki' → KAKAK + 'LAKI' (awalan LAKILAKI) → KAKAK LAKI-LAKI.
  //    'adikpr' → ADIK + 'PR' (awalan PEREMPUAN) → ADIK PEREMPUAN.
  //    'adikperempuanperempuan' (hasil angka-ganda) → sisa berawalan
  //    PEREMPUAN → ADIK PEREMPUAN. Kata dasar TANPA sisa ('kakak') →
  //    DITOLAK: tidak menebak gender (AI wajib menanyakan dulu).
  let best = '';
  let bestLen = 0;
  for (const bKey of Object.keys(BASE_GENDERED)) {
    if (!vCompact.startsWith(bKey)) continue;
    const rem = vCompact.slice(bKey.length);
    if (rem.length < 2) continue; // dasar saja / sisa terlalu pendek → jangan tebak
    let gender = '';
    if (rem.startsWith('LAKI') || 'LAKILAKI'.startsWith(rem)) gender = 'LAKI-LAKI';
    else if (rem.startsWith('PEREMPUAN') || 'PEREMPUAN'.startsWith(rem)) gender = 'PEREMPUAN';
    else gender = GENDER_ABBR[rem] || '';
    if (!gender) continue;
    const composed = BASE_GENDERED[bKey] + ' ' + gender;
    for (const [id] of pairs) {
      if (normId(id) === composed && id.length > bestLen) {
        best = id;
        bestLen = id.length;
      }
    }
  }
  return best;
}

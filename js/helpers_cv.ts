// ==========================================
// HELPERS CV RIREKISHO (pure logic — tanpa DOM)
// ==========================================
// Dipisah dari renderCVAjaib (10_cv_rirekisho.js) supaya bisa di-unit-test
// tanpa jsdom/global.
//
// ESM (Fase 3 langkah 12): export murni untuk vitest. Pemakai classic/bundel
// (10b_cv_builders.js & 10_cv_rirekisho.js memanggil via window.*) — alias
// window.*-nya diregistrasikan TERPUSAT lewat registerSeamAliases di
// js/main.js (Fase 3.5 Langkah 6), bukan per-simbol di file ini, supaya
// modul tetap murni (unit-test node tanpa window).

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o || {})[k], obj);
}

export function isGood(val) {
  return (
    val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-'
  );
}

// Pencari data dengan prioritas: (a) objek utama d (nested + flat), (b) ai
// (AIDATAJSON), lalu '-'. Dibuat lewat factory supaya test bisa injeksi d & ai.
export function makeV(d, ai) {
  ai = ai || {};
  const getAi = (path) => {
    let val = getPath(ai, path);
    return val && String(val).trim() !== '' ? String(val).trim() : null;
  };
  return function v(...keys) {
    for (let k of keys) {
      if (k.includes('.')) {
        let val = getPath(d, k);
        if (isGood(val)) return String(val).trim();
        let aiVal = getAi(k);
        if (aiVal) return aiVal;
      } else {
        // coba langsung (lowercase di d), lalu uppercase, lalu ai
        if (d[k] !== undefined && isGood(d[k])) return String(d[k]).trim();
        let cleanKey = String(k)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '');
        if (d[cleanKey] !== undefined && isGood(d[cleanKey])) return String(d[cleanKey]).trim();
        let aiVal = getAi(k);
        if (aiVal) return aiVal;
      }
    }
    return '-';
  };
}

// Normalisasi sumber array riwayat: boleh array langsung atau string JSON
// (AIDATAJSON). Bukan array → [] (aman untuk null/undefined/'-'/objek).
export function asArr(src) {
  if (Array.isArray(src)) return src;
  if (typeof src === 'string' && src.trim() && src !== '-') {
    try {
      const p = JSON.parse(src);
      return Array.isArray(p) ? p : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Gabungkan dua sumber array riwayat (kolom master + isi CV AI) jadi union
// dengan dedupe per kunci — SATU sumber tidak boleh menutupi yang lain.
// Kolom master sering hanya menyimpan baris pertama (mis. keluarga_1)
// padahal isi CV AI punya 3-4 anggota → tanpa merge preview CV tampak
// "dikit". Algoritma disamakan dengan mergeRiwayatArrays backend
// (netlify/functions/_lib/actions-extra.js). keyOf menentukan kunci dedupe
// per tipe (pendidikan/pekerjaan/keluarga); entri tanpa kunci valid dibuang.
export function mergeArrRiwayat(srcA, srcB, keyOf, normalize = null) {
  const seen = new Set();
  const out = [];
  const norm = typeof normalize === 'function' ? normalize : null;
  const lists = [].concat(asArr(srcA), asArr(srcB));
  for (const e of lists) {
    if (!e || typeof e !== 'object') continue;
    // Normalisasi bentuk kunci SEBELUM dedupe — kunci dedupe ikut menyatu
    // (sekolah_id X dan sekolah X terdeteksi satu baris, bukan dobel).
    const item = norm ? norm(e) : e;
    const k = keyOf ? keyOf(item) : JSON.stringify(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------
// NORMALISATOR RIWAYAT TERPUSAT (akar perbaikan "benerin satu, lain rusak")
// ---------------------------------------------------------------------------
// Dua sumber data riwayat memakai DUA bentuk kunci berbeda:
//   - Form AI (js/pages/ai_form.ts → arrayFields): sekolah_id / perusahaan_id /
//     jabatan_id / hubungan_id / pekerjaan_id / masuk / keluar
//   - Kolom master (buildMasterNested): sekolah / perusahaan / jabatan /
//     hubungan / masuk / keluar (+ alias snake_case/camelCase lama)
// Builder CV (10b_cv_builders.ts) membaca bentuk KANONIKAL (sekolah,
// perusahaan, jabatan, …) — entri yang hanya punya kunci *_id (isi CV AI)
// dirender KOSONG: tanggal & gaji tampil (kuncinya kebetulan sama), nama
// sekolah/perusahaan/jabatan hilang. Dulu tiap gejala "ditambal" dengan
// menambah alias di SATU pembaca → perbaikan bagian lain langsung rusak lagi.
// Sekarang SEMUA entri riwayat dinormalkan SATU KALI di titik gabung
// (renderCVAjaib → mergeArrRiwayat), SEBELUM dedupe — kunci dedupe ikut
// menyatu (sekolah_id X dan sekolah X = satu baris, bukan dua).
// Hanya MENGISI kunci kanonikal yang kosong dari alias — nilai yang sudah ada
// TIDAK pernah ditimpa (additive; aman untuk semua konsumen lama).
const RIWAYAT_ALIAS_MAP: Record<string, Record<string, string[]>> = {
  pendidikan: {
    sekolah: ['sekolah_id', 'nama_sekolah', 'namaSekolah'],
    jurusan_id: ['jurusan'],
    masuk: ['tahun_masuk', 'tahunMasuk'],
    lulus: ['tahun_lulus', 'tahunLulus'],
  },
  pekerjaan: {
    perusahaan: ['perusahaan_id', 'nama_perusahaan', 'namaPerusahaan', 'namaPt'],
    jabatan: ['jabatan_id', 'posisi'],
    masuk: ['tahun_masuk', 'tahunMasuk'],
    keluar: ['tahun_keluar', 'tahunKeluar'],
  },
  keluarga: {
    hubungan: ['hubungan_id'],
    pekerjaan: ['pekerjaan_id'],
    umur: ['usia'],
    usia: ['umur'],
  },
};

export function normalisasiRiwayat(src, tipe) {
  const map = RIWAYAT_ALIAS_MAP[tipe];
  // Tipe tidak dikenal → kembalikan sumber apa adanya (array/string/objek);
  // null/undefined → [] (konsisten dengan asArr).
  if (!map) return src === undefined || src === null ? [] : src;
  // Objek tunggal (dipanggil mergeArrRiwayat per-entri) → bungkus lalu buka.
  if (src && typeof src === 'object' && !Array.isArray(src)) {
    return normalisasiRiwayat([src], tipe)[0] || src;
  }
  const list = asArr(src);
  if (!list.length) return list;
  return list.map((e) => {
    if (!e || typeof e !== 'object') return e;
    const out = Object.assign({}, e);
    let changed = false;
    for (const [target, aliases] of Object.entries(map)) {
      if (isGood(out[target])) continue;
      for (const alias of aliases) {
        if (isGood(out[alias])) {
          out[target] = String(out[alias]).trim();
          changed = true;
          break;
        }
      }
    }
    return changed ? out : e;
  });
}

// Format Tahun & Bulan ala Jepang (2012年7月)
// Regex dulu supaya akurat (tanpa pergeseran timezone):
//   "2012"               -> 2012年
//   "2012-07"/"2012/7"   -> 2012年7月
//   "2001-06-30T17:00:00.000Z" -> 2001年6月
export function fmtMonthYearJp(str) {
  if (!str || str === '-') return '';
  let s = String(str).trim();
  if (/^\d{4}$/.test(s)) return s + '年';
  let m = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (m) return m[1] + '年' + parseInt(m[2], 10) + '月';
  let dt = new Date(s);
  // @ts-expect-error JS→TS migration
  if (isNaN(dt)) return s;
  return dt.getFullYear() + '年' + (dt.getMonth() + 1) + '月';
}

export const helpers_cv = {
  getPath,
  isGood,
  makeV,
  fmtMonthYearJp,
  asArr,
  mergeArrRiwayat,
  normalisasiRiwayat,
};

// BRIDGE ESM → classic (bundel): alias window.* (getPath/isGood/makeV/
// fmtMonthYearJp/mergeArrRiwayat) diregistrasikan dari js/main.js via
// registerSeamAliases (Fase 3.5 Langkah 6) — file ini tetap murni.

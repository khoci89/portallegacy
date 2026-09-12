// js/pages/ai_form.js — sekarang ESM (Fase 3 langkah 13): diload type=module.
// State (chatHistory, latestCandidateData, *Base64/*File, dll) PRIVATE modul;
// fungsi yang dipanggil HTML onclick/onchange/onload + string onclick dinamis
// (renderEditableArray) di-alias ke window di bridge bawah. Bare global dari
// luar dipanggil via window.* eksplisit (tr, callAPI, CURRENT_LANG,
// renderLanguageLight, cekUploadFile).
// ==========================================
// AI FORM (Qween CV) — konteks dari URL + logika chat/autofill/upload
// ==========================================
// ENTRY ESM (Fase 3.5 Langkah 6): halaman meng-import core lewat bridge.js
// (i18n + api-client) dan mendaftarkan alias seam HTML↔JS TERPUSAT via
// registerSeamAliases — bukan window.X = X per baris.
import { registerSeamAliases } from '../core/bridge.ts';
import { withRetry } from '../core/retry.ts';
import { escapeHtml } from '../core/html.ts';
import { base64ToBlob, downscaleScanImage } from '../core/file.ts';
import '../init/util.ts';
import { uploadToCloudinary } from '../cloudinary.ts';
import { idbGet, idbSet, idbRemove } from '../core/idb.ts';
import { appendHTML as _appendHTML, sendMessage as _sendMessage, type ChatDeps } from './ai-chat.ts';

// FASE 3/4: dulu diisi server (GAS scriptlet) saat halaman dibuka dari
// Portal ASJ. Sekarang dibaca dari query string URL (?flow=&job=&bidang=&wa=&nama=)
// - persis parameter yang sama, cuma sumbernya URL bukan server-side render.
(function () {
  function cleanPhoneJS(wa) {
    if (!wa) return '';
    let s = String(wa).replace(/\D/g, '');
    if (s.startsWith('0')) s = '62' + s.substring(1);
    else if (s.startsWith('8')) s = '62' + s;
    return s;
  }
  const p = new URLSearchParams(window.location.search);
  const flow = (p.get('flow') || 'master').toLowerCase() === 'apply' ? 'apply' : 'master';
  window.AI_FORM_CONTEXT = {
    flow: flow,
    job: (p.get('job') || '').trim(),
    bidang: (p.get('bidang') || '').trim(),
    wa: cleanPhoneJS(p.get('wa') || ''),
    nama: (p.get('nama') || '').trim(),
  };
})();
function $(id) {
  return document.getElementById(id);
}
let chatHistory = [];
let latestCandidateData: Record<string, any> = {};
let currentPhotoBase64 = '';
let currentJftBase64 = '';
let currentSswBase64 = '';
let currentJftFile = null;
let currentSswFile = null;
let currentKtpFile = null;
let currentKkFile = null;
let currentIjazahSdFile = null;
let currentIjazahSmpFile = null;
let currentIjazahSmaFile = null;
let currentUnivFile = null;
const urlLogo =
  'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo_asj.png';
const urlJeklin =
  'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png';
const formContext: Record<string, any> = window.AI_FORM_CONTEXT || {};
const fieldPaths = {
  // 1. Identitas & Kontak
  f_nama: 'identitas.nama_lengkap',
  f_katakana: 'identitas.katakana',
  f_panggilan: 'identitas.panggilan',
  f_panggilan_katakana: 'identitas.panggilan_katakana',
  f_tmplahir: 'identitas.tempat_lahir',
  f_tgllahir: 'identitas.tgl_lahir',
  f_umur: 'identitas.umur',
  f_gender: 'identitas.gender',
  f_agama: 'identitas.agama',
  f_goldar: 'identitas.golongan_darah',
  f_status: 'identitas.status_nikah',
  f_anak: 'identitas.anak',
  f_email: 'identitas.email',
  f_alamat: 'identitas.alamat',
  f_hp: 'identitas.hp',
  f_hpdarurat: 'identitas.hp_darurat',
  f_ktp: 'identitas.ktp',
  f_paspor: 'identitas.paspor',
  f_sim: 'identitas.sim',

  // 2. Fisik & Ukuran
  f_tb: 'fisik.tb',
  f_bb: 'fisik.bb',
  f_topi: 'fisik.topi',
  f_baju: 'fisik.baju',
  f_sepatu: 'fisik.sepatu',
  f_tangan: 'fisik.tangan_dominan',
  f_tahan_ac: 'fisik.tahan_ac',

  // 3. Medis & Kebiasaan (Sudah Bilingual)
  f_matakanan: 'medis.mata_kanan',
  f_matakiri: 'medis.mata_kiri',
  f_kacamata: 'medis.kacamata',
  f_butawarna: 'medis.buta_warna',
  f_tato: 'medis.tato',
  f_rokok: 'medis.rokok',
  f_alkohol: 'medis.alkohol',
  f_alergi_id: 'medis.alergi_id',
  f_alergi_jp: 'medis.alergi_jp',
  f_medis_id: 'medis.riwayat_medis_id',
  f_medis_jp: 'medis.riwayat_medis_jp',
  f_laka_id: 'medis.riwayat_kecelakaan_id',
  f_laka_jp: 'medis.riwayat_kecelakaan_jp',

  // 4. Jiko PR & Wawancara (Sudah Bilingual)
  f_keinginan_id: 'wawancara.keinginan_id',
  f_keinginan_jp: 'wawancara.keinginan_jp',
  f_tujuan_id: 'wawancara.tujuan_ke_jepang',
  f_tujuan_jp: 'wawancara.tujuan_ke_jepang_jp',
  f_riwayatjepang: 'wawancara.riwayat_jepang',
  f_promo_id: 'wawancara.promosi_id',
  f_promo_jp: 'wawancara.promosi_jp',
  f_lebih_id: 'wawancara.kelebihan_id',
  f_lebih_jp: 'wawancara.kelebihan_jp',
  f_kurang_id: 'wawancara.kekurangan_id',
  f_kurang_jp: 'wawancara.kekurangan_jp',
  f_hobi_id: 'wawancara.hobi_id',
  f_hobi_jp: 'wawancara.hobi_jp',
  f_keahlian_id: 'wawancara.keahlian_id',
  f_keahlian_jp: 'wawancara.keahlian_jp',
  f_moti_id: 'wawancara.motivasi_id',
  f_moti_jp: 'wawancara.motivasi_jp',
  f_alasan_id: 'wawancara.alasan_bidang_id',
  f_alasan_jp: 'wawancara.alasan_bidang_jp',
  f_pulang_id: 'wawancara.rencana_pulang_id',
  f_pulang_jp: 'wawancara.rencana_pulang_jp',
  f_lama: 'wawancara.lama_di_jepang',
  f_gaji_yen: 'wawancara.harapan_gaji',
  f_tabungan: 'wawancara.harapan_tabungan',

  // 5. Sertifikasi
  f_bhs_jepang: 'sertifikasi.bahasa_jepang',
  f_nilai: 'sertifikasi.nilai',
  f_lisensi: 'sertifikasi.lisensi',

  // 6. Kenalan di Jepang (Sudah Bilingual)
  f_kenalan_nama_id: 'kenalan_jepang.nama_id',
  f_kenalan_nama_jp: 'kenalan_jepang.nama_jp',
  f_kenalan_hub_id: 'kenalan_jepang.hubungan_id',
  f_kenalan_hub_jp: 'kenalan_jepang.hubungan_jp',
  f_kenalan_kerja_id: 'kenalan_jepang.pekerjaan_id',
  f_kenalan_kerja_jp: 'kenalan_jepang.pekerjaan_jp',
  f_kenalan_usia: 'kenalan_jepang.usia',
  f_kenalan_alamat_id: 'kenalan_jepang.alamat_id',
  f_kenalan_alamat_jp: 'kenalan_jepang.alamat_jp',
};
// Opsi dropdown isi-manual (dwi bahasa; nilai tersimpan tetap bersih).
const TINGKAT_OPTIONS = ['SD', 'SMP', 'SMA/SMK', 'D3/S1', 'LPK BAHASA'];
// ----------------------------------------------------------------------------
// PAIRED DROPDOWN (ID ↔ kanji) — 2026-09-10
// ----------------------------------------------------------------------------
// Registry pasangan di-import dari shared/silsilah.ts — SATU SUMBER juga dipakai
// prompt sistem Qween Jeklin (netlify/functions → ai/chat.ts) supaya nilai
// balasan AI PERSIS sama dengan opsi dropdown (tidak pernah drift).
import {
  KELUARGA_PAIRS,
  PEKERJAAN_PAIRS,
  JABATAN_PAIRS,
  KENALAN_PAIRS,
  RIWAYAT_JEPANG_PAIRS,
  pairJpOf,
  pairIdOf,
} from '../../shared/silsilah.ts';
// Keluarga (silsilah lengkap): ayah/ibu/suami/istri/anak/kakak/adik ×
// laki-laki/perempuan, plus cucu, kakek-nenek, mertua, ipar, keponakan.
// Pekerjaan keluarga & kenalan, jabatan kerja, kenalan JP — lihat silsilah.ts.
// Dropdown statis (kartu identitas) — pasangan [nilai tersimpan, label kanji].
// Nilai mengikuti bentuk yang sudah tersimpan di master (lihat buildMasterNested
// & Rirekisho: LAKI-LAKI/PEREMPUAN, ISLAM, BELUM MENIKAH, dsb.).
const IDENTITAS_PAIRS = {
  gender: [
    ['LAKI-LAKI', '男性'],
    ['PEREMPUAN', '女性'],
  ],
  agama: [
    ['ISLAM', 'イスラム教'],
    ['KRISTEN', 'キリスト教'],
    ['KATOLIK', 'カトリック'],
    ['HINDU', 'ヒンドゥー教'],
    ['BUDDHA', '仏教'],
  ],
  golongan_darah: [
    ['A', 'A'],
    ['B', 'B'],
    ['AB', 'AB'],
    ['O', 'O'],
  ],
  status_nikah: [
    ['BELUM MENIKAH', '未婚'],
    ['MENIKAH', '既婚'],
  ],
  tangan_dominan: [
    ['KANAN', '右手'],
    ['KIRI', '左手'],
  ],
  medis_boolean: [
    ['TIDAK ADA', '無し'],
    ['ADA (MINOR)', '軽微あり'],
    ['ADA (BERAT)', '重いあり'],
  ],
  ya_tidak: [
    ['TIDAK', '無し'],
    ['YA', '有り'],
  ],
};
// Peta pemakaian: fieldPath → pasangan (kartu identitas, bukan kartu riwayat).
const FIELD_PAIRS: Record<string, Array<any>> = {
  'identitas.gender': IDENTITAS_PAIRS.gender,
  'identitas.agama': IDENTITAS_PAIRS.agama,
  'identitas.golongan_darah': IDENTITAS_PAIRS.golongan_darah,
  'identitas.status_nikah': IDENTITAS_PAIRS.status_nikah,
  'fisik.tangan_dominan': IDENTITAS_PAIRS.tangan_dominan,
  'wawancara.riwayat_jepang': RIWAYAT_JEPANG_PAIRS,
  'fisik.tahan_ac': IDENTITAS_PAIRS.ya_tidak,
  'medis.kacamata': IDENTITAS_PAIRS.ya_tidak,
  'medis.buta_warna': IDENTITAS_PAIRS.ya_tidak,
  'medis.tato': IDENTITAS_PAIRS.ya_tidak,
  'medis.tindik': IDENTITAS_PAIRS.ya_tidak,
  'medis.rokok': IDENTITAS_PAIRS.ya_tidak,
  'medis.alkohol': IDENTITAS_PAIRS.ya_tidak,
  'medis.alergi_id': IDENTITAS_PAIRS.medis_boolean,
  'medis.riwayat_medis_id': IDENTITAS_PAIRS.medis_boolean,
  'medis.riwayat_kecelakaan_id': IDENTITAS_PAIRS.medis_boolean,
  // Kenalan di Jepang: hubungan & pekerjaan berpasangan.
  'kenalan_jepang.hubungan_id': KENALAN_PAIRS,
  'kenalan_jepang.pekerjaan_id': PEKERJAAN_PAIRS,
};

// Ukuran dropdown (ID + JP): satu field kanonik menyimpan nilai ID, label
// menampilkan ID + JP. Menurut user: "cukup 1 field yang memuat gabungan".
const SEPATU_PAIRS: Array<[string, string]> = [
  ['36', '36 (JP 23.0cm)'], ['37', '37 (JP 23.5cm)'], ['38', '38 (JP 24.0cm)'],
  ['39', '39 (JP 24.5cm)'], ['40', '40 (JP 25.0cm)'], ['41', '41 (JP 25.5cm)'],
  ['42', '42 (JP 26.0cm)'], ['43', '43 (JP 26.5cm)'], ['44', '44 (JP 27.0cm)'],
  ['45', '45 (JP 27.5cm)'], ['46', '46 (JP 28.0cm)'],
];
const BAJU_PAIRS: Array<[string, string]> = [
  ['S', 'S (JP S)'], ['M', 'M (JP M)'], ['L', 'L (JP L)'],
  ['XL', 'XL (JP LL)'], ['XXL', 'XXL (JP 3L)'],
];
const TOPI_PAIRS: Array<[string, string]> = [
  ['54', '54 (JP 54cm)'], ['56', '56 (JP 56cm)'], ['58', '58 (JP 58cm)'],
  ['60', '60 (JP 60cm)'], ['62', '62 (JP 62cm)'],
];
const SIZE_FIELDS: Record<string, Array<[string, string]>> = {
  'fisik.sepatu': SEPATU_PAIRS,
  'fisik.baju': BAJU_PAIRS,
  'fisik.topi': TOPI_PAIRS,
};

// Pencari pasangan (pairJpOf/pairIdOf) di-import dari js/silsilah.ts —
// SATU implementasi untuk frontend & backend (tanpa duplikat).
// Sinkronkan pasangan DUA ARAH di objek data: set path -> value, lalu isi
// path partner (bila ada di PAIRED_PARTNER) dengan pasangannya — HANYA jika
// partner masih kosong atau nilainya tidak cocok, dan hanya jika pasangan
// ditemukan di registry. Nilai bebas (di luar registry) tidak pernah ditimpa.
const PAIRED_PARTNER: Record<string, string> = {
  'identitas.gender': 'identitas.gender_jp',
  'identitas.agama': 'identitas.agama_jp',
  'identitas.status_nikah': 'identitas.status_nikah_jp',
  'wawancara.riwayat_jepang': 'wawancara.riwayat_jepang_jp',
  'kenalan_jepang.hubungan_id': 'kenalan_jepang.hubungan_jp',
  'kenalan_jepang.pekerjaan_id': 'kenalan_jepang.pekerjaan_jp',
};
const PAIRED_PARTNER_JP: Record<string, string> = {
  'identitas.gender_jp': 'identitas.gender',
  'identitas.agama_jp': 'identitas.agama',
  'identitas.status_nikah_jp': 'identitas.status_nikah',
  'wawancara.riwayat_jepang_jp': 'wawancara.riwayat_jepang',
  'kenalan_jepang.hubungan_jp': 'kenalan_jepang.hubungan_id',
  'kenalan_jepang.pekerjaan_jp': 'kenalan_jepang.pekerjaan_id',
};
const PAIRED_PARS: Record<string, Array<any>> = {
  'identitas.gender': IDENTITAS_PAIRS.gender,
  'identitas.gender_jp': IDENTITAS_PAIRS.gender,
  'identitas.agama': IDENTITAS_PAIRS.agama,
  'identitas.agama_jp': IDENTITAS_PAIRS.agama,
  'identitas.status_nikah': IDENTITAS_PAIRS.status_nikah,
  'identitas.status_nikah_jp': IDENTITAS_PAIRS.status_nikah,
  'wawancara.riwayat_jepang': RIWAYAT_JEPANG_PAIRS,
  'wawancara.riwayat_jepang_jp': RIWAYAT_JEPANG_PAIRS,
  'kenalan_jepang.hubungan_id': KENALAN_PAIRS,
  'kenalan_jepang.hubungan_jp': KENALAN_PAIRS,
  'kenalan_jepang.pekerjaan_id': PEKERJAAN_PAIRS,
  'kenalan_jepang.pekerjaan_jp': PEKERJAAN_PAIRS,
};
function setPairedValue(path, value) {
  setByPath(latestCandidateData, path, value);
  const partnerPath = PAIRED_PARTNER[path] || PAIRED_PARTNER_JP[path];
  const pairs = PAIRED_PARS[path];
  if (!partnerPath || !pairs) return;
  const isId = !path.endsWith('_jp') && !path.endsWith('.pekerjaan_jp');
  const partnerVal = isId ? pairJpOf(pairs, value) : pairIdOf(pairs, value);
  if (!partnerVal) return; // nilai bebas di luar registry — partner dibiarkan
  const cur = String(getByPath(latestCandidateData, partnerPath) || '').trim();
  if (cur && cur !== partnerVal) {
    // Partner sudah terisi beda: timpa HANYA kalau partner adalah hasil
    // pair registry lain (tak mungkin beda kalau konsisten) — pilih aman:
    // timpa supaya selalu berpasangan (permintaan user: kanji harus pas).
    void cur;
  }
  setByPath(latestCandidateData, partnerPath, partnerVal);
}
const arrayFields = {
  pendidikan: [
    ['tingkat', 'form.ai_f_tingkat', 'select', TINGKAT_OPTIONS],
    ['sekolah_id', 'form.ai_f_sekolah_id'],
    ['sekolah_jp', 'form.ai_f_sekolah_jp'],
    ['jurusan_id', 'form.ai_f_jurusan_id'],
    ['jurusan_jp', 'form.ai_f_jurusan_jp'],
    ['masuk', 'form.ai_f_masuk', 'month-year'],
    ['lulus', 'form.ai_f_lulus', 'month-year'],
  ],
  pekerjaan: [
    ['perusahaan_id', 'form.ai_f_perusahaan_id'],
    ['perusahaan_jp', 'form.ai_f_perusahaan_jp'],
    ['jabatan_id', 'form.ai_f_jabatan_id', 'select-pair', JABATAN_PAIRS],
    ['jabatan_jp', 'form.ai_f_jabatan_jp', 'select-pair', JABATAN_PAIRS],
    ['masuk', 'form.ai_f_mulai', 'month-year'],
    ['keluar', 'form.ai_f_selesai', 'month-year'],
    ['gaji', 'form.ai_f_gaji'],
  ],
  keluarga: [
    ['hubungan_id', 'form.ai_f_hubungan_id', 'select-pair', KELUARGA_PAIRS],
    ['hubungan_jp', 'form.ai_f_hubungan_jp', 'select-pair', KELUARGA_PAIRS],
    ['nama', 'form.ai_f_nama'],
    ['katakana', 'form.ai_f_katakana'],
    ['umur', 'form.ai_f_umur'],
    ['pekerjaan_id', 'form.ai_f_pekerjaan_id', 'select-pair', PEKERJAAN_PAIRS],
    ['pekerjaan_jp', 'form.ai_f_pekerjaan_jp', 'select-pair', PEKERJAAN_PAIRS],
    ['gaji', 'form.ai_f_gaji'],
  ],
};

// Pair-sync kartu riwayat: pasangan field dalam SATU item array. updateArrayField
// mengisi partner otomatis (ID→kanji atau kanji→ID) dari registry.
const ARRAY_PAIRS: Record<string, any> = {
  'keluarga.hubungan_id': { partner: 'hubungan_jp', pairs: KELUARGA_PAIRS, dir: 'id' },
  'keluarga.hubungan_jp': { partner: 'hubungan_id', pairs: KELUARGA_PAIRS, dir: 'jp' },
  'keluarga.pekerjaan_id': { partner: 'pekerjaan_jp', pairs: PEKERJAAN_PAIRS, dir: 'id' },
  'keluarga.pekerjaan_jp': { partner: 'pekerjaan_id', pairs: PEKERJAAN_PAIRS, dir: 'jp' },
  'pekerjaan.jabatan_id': { partner: 'jabatan_jp', pairs: JABATAN_PAIRS, dir: 'id' },
  'pekerjaan.jabatan_jp': { partner: 'jabatan_id', pairs: JABATAN_PAIRS, dir: 'jp' },
};

// Tahun (masuk/lulus/mulai/keluar): dropdown supaya format konsisten — dulu
// input bebas, sering "2019" vs "2019-04" campur → sort Rirekisho kacau.
function yearOptionsHtml(current: any) {
  const now = new Date().getFullYear();
  let html = '<option value="">' + window.tr('form.ai_f_pilih') + '</option>';
  let found = String(current || '').trim() !== '';
  for (let y = now; y >= now - 60; y--) {
    if (String(current) === String(y)) found = true;
    html += '<option value="' + y + '"' + (String(current) === String(y) ? ' selected' : '') + '>' + y + '</option>';
  }
  // Nilai tahun lama di luar rentang tetap ditampilkan (tidak hilang).
  if (!found && String(current || '').trim() !== '') {
    html += '<option value="' + escapeHtml(String(current)) + '" selected>' + escapeHtml(String(current)) + '</option>';
  }
  return html;
}

function monthOptionsHtml(current: any) {
  let html = '<option value="">' + window.tr('form.ai_f_pilih') + '</option>';
  for (let m = 1; m <= 12; m++) {
    const sm = m < 10 ? '0' + m : String(m);
    html += '<option value="' + sm + '"' + (String(current) === sm ? ' selected' : '') + '>' + sm + '</option>';
  }
  return html;
}

function getByPath(source, path) {
  return path.split('.').reduce(function (value, key) {
    return value && value[key] !== undefined ? value[key] : '';
  }, source || {});
}

function setByPath(target, path, value) {
  const keys = path.split('.');
  let cursor = target;
  keys.slice(0, -1).forEach(function (key) {
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
}
function mergeCandidateData(current, incoming) {
  if (Array.isArray(incoming)) {
    const currentArray = Array.isArray(current) ? current : [];
    if (!incoming.length) return currentArray.slice();
    const mergedArray = incoming.map(function (item, index) {
      return mergeCandidateData(currentArray[index], item);
    });
    return mergedArray.concat(currentArray.slice(incoming.length));
  }
  if (incoming && typeof incoming === 'object') {
    const base = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
    const result: Record<string, any> = {};
    Object.keys(base).forEach(function (key) {
      result[key] = base[key];
    });
    Object.keys(incoming).forEach(function (key) {
      result[key] = mergeCandidateData(base[key], incoming[key]);
    });
    return result;
  }
  if (
    incoming === undefined ||
    incoming === null ||
    (typeof incoming === 'string' && !incoming.trim())
  )
    return current === undefined ? '' : current;
  return incoming;
}

function getChatDeps(): ChatDeps {
  return {
    $: $,
    chatHistory: chatHistory,
    latestCandidateData: latestCandidateData,
    currentPhotoBase64: currentPhotoBase64,
    urlJeklin: urlJeklin,
    formContext: formContext as { flow: string },
    saveToLocal: saveToLocal,
    mergeCandidateData: mergeCandidateData,
    updateFormUI: updateFormUI,
    setLatestCandidateData: function (d) {
      latestCandidateData = d;
    },
  };
}

function enableManualPreview() {
  document
    .querySelectorAll('#formPanel input[readonly], #formPanel textarea[readonly]')
    .forEach(function (el) {
      el.removeAttribute('readonly');
      el.setAttribute('title', window.tr('form.ai_f_tooltip'));
    });
  Object.keys(fieldPaths).forEach(function (id) {
    const el = $(id);
    if (!el || el.dataset.manualBound) return;
    el.dataset.manualBound = 'true';
    el.addEventListener('input', function () {
      latestCandidateData =
        latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
      setByPath(latestCandidateData, fieldPaths[id], el.value);
      el.classList.add('border-sky-400');
      saveToLocal();
      // Auto-fill umur saat tanggal lahir berubah.
      if (id === 'f_tgllahir') syncUmurFromTglLahir();
    });
  });
}

// Pair-sync statis (kartu identitas/kenalan): elemen <select> pasangan di
// enableStaticPairSelects() di bawah mengisi partner lewat fungsi ini.
function applyStaticPair(path, value) {
  latestCandidateData =
    latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
  setPairedValue(path, value);
  saveToLocal();
  updateFormUI();
}

// Ganti field identitas/kenalan tertentu dari <input readonly> jadi <select>
// dengan pasangan registry (permintaan: "semua dikasih dropdown super lengkap,
// kolom ID maupun JP"). Input asli dipertahankan sebagai sumber data; select
// disisipkan menimpanya (data-pair-sel). Hanya field yang punya FIELD_PAIRS.
function enableStaticPairSelects() {
  Object.keys(FIELD_PAIRS).forEach(function (path) {
    const id = Object.keys(fieldPaths).find(function (k) {
      return fieldPaths[k] === path;
    });
    if (!id) return;
    const orig = $(id);
    if (!orig || orig.dataset.pairBound) return;
    orig.dataset.pairBound = '1';
    const pairs = FIELD_PAIRS[path];
    const isJp = /_jp$/.test(path);
    const sel = document.createElement('select');
    sel.className = orig.className;
    sel.dataset.pairSel = path;
    sel.onchange = function () {
      applyStaticPair(path, (sel as HTMLSelectElement).value);
    };
    // Fungsi refresh opsi — dipanggil updateFormUI supaya select mengikuti
    // nilai terbaru (dari chat AI/database) dan bahasa label aktif.
    (sel as any).refreshPairs = function () {
      const cur = String(getByPath(latestCandidateData, path) || '').trim();
      let html = '<option value="">' + window.tr('form.ai_f_pilih') + '</option>';
      let found = cur === '';
      for (let i = 0; i < pairs.length; i++) {
        const val = isJp ? pairs[i][1] : pairs[i][0];
        const lbl = isJp ? pairs[i][1] + '（' + pairs[i][0] + '）' : pairs[i][0] + '（' + pairs[i][1] + '）';
        const isSel = cur === String(val);
        if (isSel) found = true;
        html += '<option value="' + escapeHtml(String(val)) + '"' + (isSel ? ' selected' : '') + '>' + escapeHtml(lbl) + '</option>';
      }
      if (!found && cur) {
        html += '<option value="' + escapeHtml(cur) + '" selected>' + escapeHtml(cur) + '</option>';
      }
      sel.innerHTML = html;
    };
    (sel as any).refreshPairs();
    orig.parentNode && orig.parentNode.replaceChild(sel, orig);
    // Simpan pemetaan id→path untuk setValue (updateFormUI).
    STATIC_PAIR_SELECTS[id] = { sel: sel, path: path };
  });
}
const STATIC_PAIR_SELECTS: Record<string, any> = {};

// ---------------------------------------------------------------------------
// TANGGAL LAHIR → UMUR AUTO + NORMALISASI DATE INPUT
// ---------------------------------------------------------------------------
// Normalisasi berbagai format tanggal lahir ke YYYY-MM-DD untuk <input type="date">.
function normalizeDateToIso(raw: string): string {
  if (!raw) return '';
  const s = String(raw).trim();
  // Sudah YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY/MM/DD
  const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m2) return m2[1] + '-' + m2[2].padStart(2, '0') + '-' + m2[3].padStart(2, '0');
  // DD/MM/YYYY atau MM/DD/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    // MM/DD/YYYY: bulan > 12 tidak mungkin jadi bulan → DD/MM/YYYY
    if (a > 12) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    // DD/MM/YYYY: hari > 12 tidak mungkin jadi hari → MM/DD/YYYY
    if (b > 12) return m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0');
    // Keduanya ≤ 12 → asumsikan DD/MM/YYYY (format Indonesia default)
    return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  }
  return ''; // format tidak dikenali → biarkan kosong
}

// Hitung umur dari tanggal lahir YYYY-MM-DD.
function computeAge(isoDate: string): number {
  if (!isoDate) return 0;
  const parts = isoDate.split('-');
  if (parts.length !== 3) return 0;
  const y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
  if (!y || !m || !d) return 0;
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age >= 0 ? age : 0;
}

// Sinkronisasi umur dari field tgl lahir → f_umur.
function syncUmurFromTglLahir() {
  const tgllahir = getByPath(latestCandidateData, 'identitas.tgl_lahir');
  const iso = normalizeDateToIso(String(tgllahir || ''));
  if (iso) {
    const age = computeAge(iso);
    if (age > 0) {
      setByPath(latestCandidateData, 'identitas.umur', String(age));
      setValue('f_umur', String(age));
    }
  }
}

// ---------------------------------------------------------------------------
// UKURAN SEPATU / BAJU / TOPI — DROPDOWN ID+JP
// ---------------------------------------------------------------------------
// Mengganti input ukuran dengan select yang menampilkan gabungan ID + JP.
// Menyimpan nilai kanonik (ID saja) — JP hanya di label.
function enableSizeSelects() {
  Object.keys(SIZE_FIELDS).forEach(function (path) {
    const id = Object.keys(fieldPaths).find(function (k) { return fieldPaths[k] === path; });
    if (!id) return;
    const orig = $(id);
    if (!orig || orig.dataset.sizeBound) return;
    // Jika sudah jadi pair select (FIELD_PAIRS), skip — tidak bentrok.
    if (orig.dataset.pairBound) return;
    orig.dataset.sizeBound = '1';
    const pairs = SIZE_FIELDS[path];
    const sel = document.createElement('select');
    sel.className = orig.className;
    sel.dataset.sizeSel = path;
    sel.onchange = function () {
      latestCandidateData = latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
      setByPath(latestCandidateData, path, (sel as HTMLSelectElement).value);
      saveToLocal();
    };
    (sel as any).refreshSize = function () {
      const cur = String(getByPath(latestCandidateData, path) || '').trim();
      let html = '<option value="">' + window.tr('form.ai_f_pilih') + '</option>';
      let found = cur === '';
      for (let i = 0; i < pairs.length; i++) {
        const val = pairs[i][0];
        const lbl = pairs[i][1]; // sudah "ID (JP ...)"
        if (cur === val) { found = true; }
        html += '<option value="' + escapeHtml(val) + '"' + (cur === val ? ' selected' : '') + '>' + escapeHtml(lbl) + '</option>';
      }
      if (!found && cur) {
        html += '<option value="' + escapeHtml(cur) + '" selected>' + escapeHtml(cur) + '</option>';
      }
      sel.innerHTML = html;
    };
    (sel as any).refreshSize();
    orig.parentNode && orig.parentNode.replaceChild(sel, orig);
    STATIC_PAIR_SELECTS[id] = { sel: sel, path: path, isSize: true };
  });
}

// ---------------------------------------------------------------------------
// SIM & PASPOR — STATUS SELECT + KONDISIONAL NUMBER
// ---------------------------------------------------------------------------
function syncSimPasporVisibility() {
  const pasporStatus = $('f_paspor_status') as HTMLSelectElement | null;
  const pasporInput = $('f_paspor') as HTMLInputElement | null;
  const simStatus = $('f_sim_status') as HTMLSelectElement | null;
  const simInput = $('f_sim') as HTMLInputElement | null;
  if (pasporStatus && pasporInput) {
    const statusVal = pasporStatus.value || getByPath(latestCandidateData, 'identitas.paspor_status') || '';
    pasporInput.style.display = statusVal === 'TIDAK ADA' ? 'none' : '';
    if (statusVal === 'TIDAK ADA') { pasporInput.value = ''; setByPath(latestCandidateData, 'identitas.paspor', ''); }
  }
  if (simStatus && simInput) {
    const statusVal = simStatus.value || getByPath(latestCandidateData, 'identitas.sim_status') || '';
    simInput.style.display = statusVal === 'TIDAK ADA' ? 'none' : '';
    if (statusVal === 'TIDAK ADA') { simInput.value = ''; setByPath(latestCandidateData, 'identitas.sim', ''); }
  }
}
function enableSimPasporConditional() {
  const pasporStatus = $('f_paspor_status') as HTMLSelectElement | null;
  const pasporInput = $('f_paspor') as HTMLInputElement | null;
  const simStatus = $('f_sim_status') as HTMLSelectElement | null;
  const simInput = $('f_sim') as HTMLInputElement | null;

  // Restore status dari data tersimpan.
  if (pasporStatus) {
    const savedPaspor = getByPath(latestCandidateData, 'identitas.paspor_status');
    if (savedPaspor) pasporStatus.value = String(savedPaspor);
    // Derive status dari nilai paspor jika belum ada status tersimpan.
    if (!savedPaspor && pasporInput) {
      const existing = getByPath(latestCandidateData, 'identitas.paspor');
      pasporStatus.value = existing ? 'ADA' : 'TIDAK ADA';
    }
    pasporStatus.removeAttribute('readonly');
    pasporStatus.onchange = function () {
      latestCandidateData = latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
      setByPath(latestCandidateData, 'identitas.paspor_status', pasporStatus.value);
      syncSimPasporVisibility();
      saveToLocal();
    };
  }
  if (simStatus) {
    const savedSim = getByPath(latestCandidateData, 'identitas.sim_status');
    if (savedSim) simStatus.value = String(savedSim);
    if (!savedSim && simInput) {
      const existingSim = getByPath(latestCandidateData, 'identitas.sim');
      simStatus.value = existingSim ? 'ADA' : 'TIDAK ADA';
    }
    simStatus.removeAttribute('readonly');
    simStatus.onchange = function () {
      latestCandidateData = latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
      setByPath(latestCandidateData, 'identitas.sim_status', simStatus.value);
      syncSimPasporVisibility();
      saveToLocal();
    };
  }
  syncSimPasporVisibility();
}

// Flush render tertunda saat interaksi teks selesai (input blur) — dropdown
// tidak pernah ditimpa di tengah pemakaian.
function bindDeferredFlush() {
  ['c_pendidikan', 'c_pekerjaan', 'c_keluarga'].forEach(function (cid) {
    const c = $(cid);
    if (!c || c.dataset.flushBound) return;
    c.dataset.flushBound = '1';
    c.addEventListener('blur', flushDeferredArrayRender, true); // capture: blur child
    c.addEventListener('change', flushDeferredArrayRender, true);
  });
}

export function updateArrayField(type, index, field, value) {
  if (!Array.isArray(latestCandidateData[type])) latestCandidateData[type] = [];
  if (!latestCandidateData[type][index]) latestCandidateData[type][index] = {};
  latestCandidateData[type][index][field] = value;
  // Pair-sync (2026-09-10): pilih sisi ID → kanji JP terisi pas, dan sebaliknya.
  // Dipanggil SEBELUM saveToLocal supaya pasangan ikut tersimpan.
  const pr = ARRAY_PAIRS[type + '.' + field];
  if (pr && value) {
    const partnerVal = pr.dir === 'id' ? pairJpOf(pr.pairs, value) : pairIdOf(pr.pairs, value);
    if (partnerVal) latestCandidateData[type][index][pr.partner] = partnerVal;
  }
  saveToLocal();
  // Render ulang kartu ini SAJA agar pasangan langsung terlihat — bukan seluruh
  // form (dulu updateFormUI penuh menutup dropdown yang sedang terbuka).
  updateArrayCard(type, index);
}

export function addArrayItem(type) {
  latestCandidateData =
    latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
  if (!Array.isArray(latestCandidateData[type])) latestCandidateData[type] = [];
  const item: Record<string, any> = {};
  arrayFields[type].forEach(function (definition) {
    item[definition[0]] = '';
  });
  latestCandidateData[type].push(item);
  updateFormUI();
  saveToLocal();
}

export function removeArrayItem(type, index) {
  if (!Array.isArray(latestCandidateData[type])) return;
  latestCandidateData[type].splice(index, 1);
  updateFormUI();
  saveToLocal();
}

function getStorageKey() {
  const wa = String(formContext.wa || 'baru').replace(/\D/g, '');
  const job = String(formContext.job || formContext.flow || 'master').replace(/[^a-z0-9_-]/gi, '_');
  return 'asj_qween_cv_data_' + wa + '_' + job;
}

function applyPortalContext() {
  latestCandidateData =
    latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
  const identitas = latestCandidateData.identitas || {};
  if (!identitas.nama_lengkap && formContext.nama)
    setByPath(latestCandidateData, 'identitas.nama_lengkap', formContext.nama);
  if (!identitas.hp && formContext.wa)
    setByPath(latestCandidateData, 'identitas.hp', formContext.wa);

  const label =
    formContext.flow === 'apply'
      ? 'Lamaran ' + (formContext.job || 'umum') + ' tersambung ke portal.'
      : 'CV Master tersambung ke profil portal.';
  if ($('formModeLabel')) $('formModeLabel').textContent = label;
}

// SYNC with backend: netlify/functions/_lib/ai/chat.ts isVipCatatan()
// Old regex /\[(?:KELAS\s*[A-Z0-9]+|[A-Z0-9]+)\]/i matched ANY bracketed
// tag ([MCU], [VISA], [NOTE]) — too broad. Tightened to [VIP] + [KELAS ...] only.
function isAiVipCatatan(catatan) {
  const c = catatan || '';
  return c.includes('[VIP]') || /\[KELAS\s*[A-Z0-9]+\]/i.test(c);
}

// GUARD VIP: AI CV (flow=master) khusus siswa ASJ berbadge VIP. Kandidat luar
// yang membuka URL langsung diarahkan ke Form Master Lengkap.
// FIX (bug "auto reset ke CV Master"): kalau sesi kandidat TIDAK valid di
// window ini (mis. dibuka ADMIN lewat bridge — window baru tanpa login
// kandidat), getAppData('kandidat') balas sessionInvalid tanpa myData; dulu
// itu dibaca sebagai "bukan VIP" lalu di-redirect ke CV Master padahal belum
// tentu.
//
// Dua kasus:
// 1) Window ADMIN (dari panel admin): localStorage dibagi dengan tab admin
//    (asj_admin_login='sukses'), jadi JANGAN panggil getAppData('kandidat')
//    sama sekali — request itu membawa token admin, gagal validasi sesi
//    kandidat, dan sessionInvalid di callAPI GLOBAL menghapus SEMUA sesi +
//    reload (admin ikut logout!). Admin berwenang buka AI CV kandidat apa
//    pun; server memvalidasi sesi admin di processAIChat (isAiCvAllowed OR
//    admin session).
// 2) Window kandidat: verifikasi VIP normal; kalau sesi tidak valid,
//    biarkan masuk — keputusan final di server.
function verifikasiAksesAiCv(targetWa) {
  if (localStorage.getItem('asj_admin_login') === 'sukses') {
    return Promise.resolve(true);
  }
  // FIX (loop reload tak berujung): tanpa sesi kandidat yang VALID, JANGAN
  // panggil getAppData('kandidat'). callAPI GLOBAL akan menghapus semua sesi
  // + reload saat respons sessionInvalid — guard ini dipanggil lagi setelah
  // reload (masih tanpa sesi) → halaman reload terus-menerus. Biarkan masuk;
  // keputusan final tetap di server (processAIChat: isAiCvAllowed ATAU sesi
  // admin). Kasus sesi kandidat basi (login flag ada, token kedaluwarsa)
  // tetap lewat jalur normal: reload sekali, flag dibersihkan, loop berhenti.
  if (localStorage.getItem('asj_kandidat_login') !== 'sukses') {
    return Promise.resolve(true);
  }
  // HANYA panggil getAppData('kandidat') kalau token yang benar-benar
  // terkirim MEMANG token kandidat. api-client memilih token admin lebih dulu
  // saat admin_login='sukses' (lihat blok CANDIDATE_ACTIONS di api-client.ts)
  // — mengirim token admin ke request ber-role kandidat = request pasti
  // ditolak, dan di versi lama penolakan itu memicu penghapusan SEMUA sesi +
  // reload (admin ikut ter-logout). Server kini mentoleransi admin di mode
  // kandidat (lihat handleGetAppData → isAdminView), tapi guard ini tidak
  // boleh bergantung pada perilaku itu: kalau token yang ada bukan token
  // kandidat, tidak ada gunanya bertanya — dan berisiko.
  if (!localStorage.getItem('asj_kandidat_session')) {
    return Promise.resolve(true);
  }
  return window
    .callAPI('getAppData', ['kandidat', targetWa])
    .then(function (res) {
      if (res && res.sessionInvalid) return true; // tidak bisa diverifikasi → jangan redirect
      // Respons backend rebuild menaruh data kandidat di res.candidates[0]
      // (dulu myData di backend GAS lama). Ambil catatanInt dari sana agar
      // kandidat VIP tidak salah redirect ke Form Master.
      const cand = res && Array.isArray(res.candidates) ? res.candidates[0] : null;
      let catatan = cand ? String(cand.catatanInt || cand.catatan || '') : '';
      if (!catatan && res && res.myData) catatan = String(res.myData.catatanInt || '');
      return isAiVipCatatan(catatan);
    })
    .catch(function () {
      // Kalau gagal jaringan, jangan blokir (fallback aman: biarkan masuk)
      return true;
    });
}

// Auto-fill data Master dari database (logika asli, dipindah jadi fungsi)
function jalankanAutoFill(targetWa) {
  if ($('aiTypingStatus')) {
    $('aiTypingStatus').classList.remove('hidden');
    $('aiTypingStatus').innerHTML =
      '<i class="fas fa-sync fa-spin mr-2"></i> ' + window.tr('form.ai_loading_master');
  }

  // FIX: pakai getDrafCvMaster (nested: identitas/fisik/medis/…/uploads +
  // AIDATAJSON) — dulu getExistingCandidateJsonByWa yang bentuknya FLAT
  // (kolom legacy untuk form apply), jadi form CV hanya terisi nama/HP
  // dan SIMPAN DB menimpa ai_data_json master dengan data hampir kosong.
  window
    .callAPI('getDrafCvMaster', [targetWa])
    .then(function (masterData) {
      if ($('aiTypingStatus')) $('aiTypingStatus').classList.add('hidden');
      if (masterData) {
        if (masterData.AIDATAJSON && typeof masterData.AIDATAJSON === 'string') {
          try {
            const aiParsed = JSON.parse(masterData.AIDATAJSON);
            masterData = mergeCandidateData(masterData, aiParsed);
          } catch (e) {
            console.warn('Failed to parse AIDATAJSON', e);
          }
        }
        latestCandidateData = mergeCandidateData(masterData, latestCandidateData);
        updateFormUI();
        saveToLocal();

        // JIKA BUKA CHAT PERTAMA KALI: TAMPILKAN SAPAAN PINTAR DENGAN NAMA & DATA KOSONG
        if (chatHistory.length === 0) {
          $('chatBox').innerHTML = ''; // Bersihkan sapaan lama
          const smartWelcome = generateSmartWelcomeMessage(latestCandidateData);
          appendHTML('ai', smartWelcome);
          chatHistory.push({
            role: 'assistant',
            content: JSON.stringify({ reply: smartWelcome, data: {} }),
          });
          saveToLocal();
        }
      }
    })
    .catch(function (err) {
      if ($('aiTypingStatus')) $('aiTypingStatus').classList.add('hidden');
      console.error('Gagal Auto-Fill Master:', err);
    });
}

// Pembersih draft lama ber-base64 sekarang TERSENTRALISASI di public/pwa.js
// (window.bersihkanDraftLamaBase64) — dimuat di SEMUA halaman, jadi migrasi
// satu kali jalan di halaman pertama yang dibuka user, bukan hanya ai_form.
// Alasan tidak via service worker: SW tidak punya akses localStorage.
// Di sini cukup fallback defensif kalau pwa.js belum termuat.
export async function aiFormInitApp() {
  $('logoAsj').src = urlLogo;
  // Terjemahkan label statis sesuai bahasa terpilih (asj_lang).
  if (typeof window.renderLanguageLight === 'function') {
    window.renderLanguageLight();
    const lb = document.getElementById('lang-btn-ai');
    if (lb) lb.textContent = window.CURRENT_LANG === 'jp' ? 'ID' : 'JP';
  }
  
  window.renderLanguage = () => {
    const lb = document.getElementById('lang-btn-ai');
    if (lb) lb.textContent = window.CURRENT_LANG === 'jp' ? 'ID' : 'JP';
    updateFormUI();
  };

  // Select pasangan menggantikan input identitas/kenalan tertentu SEBELUM
  // updateFormUI pertama (dipasang sekali — idempotent via dataset.pairBound).
  enableStaticPairSelects();
  bindDeferredFlush();
  enableSizeSelects();
  enableSimPasporConditional();
  enableManualPreview();
  window.callAPI('getAppData', ['public']).then(function(res) {
    if (res && res.dropdowns) {
      if (document.getElementById('jft-options')) window.populate('jft-options', res.dropdowns.jft || []);
      if (document.getElementById('ssw-options')) window.populate('ssw-options', res.dropdowns.ssw || []);
      if (document.getElementById('pekerjaan-options')) window.populate('pekerjaan-options', res.dropdowns.kategori || []);
    }
  }).catch(function(e) { console.error('Gagal memuat dropdowns', e); });

  // Buang base64 JFT/SSW dari draft versi lama (semua WA/job) supaya quota
  // localStorage langsung lega untuk user yang pernah pakai versi lama.
  // Idempotent — aman dipanggil ulang walau pwa.js sudah menjalankannya.
  if (typeof window.bersihkanDraftLamaBase64 === 'function') {
    window.bersihkanDraftLamaBase64();
  }

  // Restore draft: try IndexedDB first, then localStorage fallback
  const storageKey = getStorageKey();
  let saved: string | null = null;
  try {
    saved = await idbGet(storageKey);
    if (saved && typeof saved === 'string') {
      // Found in IndexedDB
    } else {
      saved = localStorage.getItem(storageKey);
      if (saved) {
        // Migrate: move to IndexedDB
        idbSet(storageKey, saved).catch(function () {});
      }
    }
  } catch (_) {
    saved = localStorage.getItem(storageKey);
  }
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      chatHistory = parsed.chatHistory || [];
      latestCandidateData = parsed.latestCandidateData || {};
      currentPhotoBase64 = parsed.currentPhotoBase64 || '';
      // FIX: JFT/SSW base64/file TIDAK di-restore dari localStorage. File
      // base64 PDF bisa puluhan MB -> quota localStorage 5MB penuh -> data
      // "nyangkut"/gagal simpan. Selain itu, me-restore file lama dari sesi
      // sebelumnya membuat SIMPAN DB meng-upload ulang file basi dan NIMPA
      // file yang lebih baru di DB. Sesi baru = mulai bersih; kalau user mau
      // nimpa, pilih file baru lagi. Status "sudah pernah upload" tetap
      // tampil dari DB via updateFormUI().
      currentJftBase64 = '';
      currentSswBase64 = '';
      currentJftFile = null;
      currentSswFile = null;
    } catch (e) {
      idbRemove(storageKey).catch(function () {});
      localStorage.removeItem(storageKey);
    }
  }

  applyPortalContext();

  // AUTO-FILL SPREADSHEET & SAPAAN PINTAR JEKLIN
  const targetWa =
    formContext.wa || (latestCandidateData.identitas && latestCandidateData.identitas.hp);
  if (targetWa && formContext.flow === 'master') {
    verifikasiAksesAiCv(targetWa).then(function (izin) {
      if (!izin) {
        window.location.href =
          '/master-full.html?wa=' +
          encodeURIComponent(targetWa) +
          '&nama=' +
          encodeURIComponent(formContext.nama || '');
        return;
      }
      jalankanAutoFill(targetWa);
    });
  } else if (targetWa) {
    jalankanAutoFill(targetWa);
  } else {
    if (chatHistory.length === 0) {
      sendWelcomeMessage();
    }
  }

  updateFormUI();

  if (currentPhotoBase64) {
    $('previewFoto').src = 'data:image/jpeg;base64,' + currentPhotoBase64;
    $('previewFoto').classList.remove('hidden');
    $('compressStatus').innerHTML =
      '<i class="fas fa-check-circle"></i> ' + window.tr('form.ai_status_saved');
    $('compressStatus').classList.remove('hidden');
  }
  if (currentJftBase64) {
    $('status_jft').innerHTML =
      '<i class="fas fa-check-circle"></i> ' + window.tr('form.ai_status_saved_auto');
    $('status_jft').classList.remove('hidden');
  }
  if (currentSswBase64) {
    $('status_ssw').innerHTML =
      '<i class="fas fa-check-circle"></i> ' + window.tr('form.ai_status_saved_auto');
    $('status_ssw').classList.remove('hidden');
  }

  // Auto-save every 30 seconds to prevent data loss
  setInterval(function() { saveToLocal(); }, 30000);
  window.addEventListener('resize', handleResize);
  // Desktop (>=768px): display kedua panel ditangani CSS (override `md:block`/
  // `md:flex` di main.css) — panggilan handleResize saat init tidak diperlukan.
}

function generateSmartWelcomeMessage(data) {
  const id = (data && data.identitas) || {};
  const fs = (data && data.fisik) || {};
  const iv = (data && data.wawancara) || {};
  const nama = id.panggilan || id.nama_lengkap || formContext.nama || '';

  if (nama) {
    // Deteksi daftar bidang yang masih kosong
    const missing = [];
    if (!id.ktp) missing.push(window.tr('form.chat_missing_ktp'));
    if (!id.paspor) missing.push(window.tr('form.chat_missing_paspor'));
    if (!iv.promosi_jp && iv.promosi_id) missing.push(window.tr('form.chat_missing_jiko'));
    if (!fs.topi) missing.push(window.tr('form.chat_missing_topi'));
    if (!fs.tahan_ac) missing.push(window.tr('form.chat_missing_ac'));
    if (!fs.tb) missing.push(window.tr('form.chat_missing_tb'));
    if (!fs.bb) missing.push(window.tr('form.chat_missing_bb'));
    if (!data.pendidikan || !data.pendidikan.length)
      missing.push(window.tr('form.chat_missing_pendidikan'));
    if (!data.pekerjaan || !data.pekerjaan.length)
      missing.push(window.tr('form.chat_missing_pekerjaan'));
    if (!iv.kelebihan_id) missing.push(window.tr('form.chat_missing_kelebihan'));
    if (!iv.kekurangan_id) missing.push(window.tr('form.chat_missing_kekurangan'));
    if (!iv.motivasi_id && !iv.motivasi_ke_jepang) missing.push(window.tr('form.chat_missing_motivasi'));
    if (!iv.alasan_bidang_id && !iv.alasan_memilih_bidang) missing.push(window.tr('form.chat_missing_alasan'));
    if (!iv.rencana_pulang_id && !iv.rencana_setelah_pulang) missing.push(window.tr('form.chat_missing_rencana'));
    if (!iv.tujuan_ke_jepang) missing.push(window.tr('form.chat_missing_tujuan'));
    if (!data.sertifikasi || (!data.sertifikasi.bahasa_jepang && !data.sertifikasi.jft))
      missing.push(window.tr('form.chat_missing_sertifikasi'));

    let welcomeText = window.tr('form.chat_welcome_named_intro').replace('{nama}', nama);

    if (missing.length > 0) {
      welcomeText += window
        .tr('form.chat_welcome_missing')
        .replace('{missing}', missing.slice(0, 2).join(' & '));
    } else {
      welcomeText += window.tr('form.chat_welcome_complete');
    }
    return welcomeText;
  } else {
    return window.tr('form.chat_welcome_nameless');
  }
}

function sendWelcomeMessage() {
  const welcome = window.tr('form.chat_welcome_nameless');
  appendHTML('ai', welcome);
  chatHistory.push({ role: 'assistant', content: JSON.stringify({ reply: welcome, data: {} }) });
  saveToLocal();
}

function saveToLocal() {
  try {
    // FIX: base64 JFT/SSW tidak ikut disimpan (bisa puluhan MB, quota
    // localStorage 5MB penuh -> data nyangkut). Foto dikompres 600px jadi
    // kecil dan aman disimpan untuk preview; file JFT/SSW dipilih ulang
    // kalau halaman di-reload (status lama tetap tampil dari DB).
    const payload = JSON.stringify({
      chatHistory: chatHistory,
      latestCandidateData: latestCandidateData,
      currentPhotoBase64: currentPhotoBase64,
    });
    // IndexedDB for large data (no 5MB quota), fallback to localStorage
    idbSet(getStorageKey(), payload).catch(function () {
      try { localStorage.setItem(getStorageKey(), payload); } catch (_) {}
    });
  } catch (error) {
    console.warn('Penyimpanan lokal penuh; data teks tetap tersimpan di halaman saat ini.', error);
  }
}

// Tab terakhir yang aktif di layar < 768px + status desktop/mobile.
// Dipakai handleResize supaya rotasi layar kembali ke tab yang dipilih,
// TANPA memaksa pindah tab saat iPhone memicu "resize" tiap scroll
// (URL bar Safari naik/turun) — penyebab kolom chat "puter-puter".
let lastMobileTab = 'chat';
let wasDesktop = window.innerWidth >= 768;
export function switchTab(target) {
  lastMobileTab = target;
  if (window.innerWidth >= 768) return;
  const cPanel = $('chatPanel'),
    fPanel = $('formPanel'),
    tChat = $('btnTabChat'),
    tForm = $('btnTabForm');
  if (target === 'chat') {
    cPanel.classList.remove('hidden');
    fPanel.classList.add('hidden');
    tChat.className =
      'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors';
    tForm.className =
      'flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors';
  } else {
    cPanel.classList.add('hidden');
    fPanel.classList.remove('hidden');
    tForm.className =
      'flex-1 py-3 text-xs font-bold bg-amber-600/20 text-amber-400 border-b-2 border-amber-500 transition-colors';
    tChat.className =
      'flex-1 py-3 text-xs font-bold text-slate-400 border-b-2 border-transparent transition-colors';
  }
}

function handleResize() {
  // iPhone Safari memicu "resize" tiap scroll (URL bar naik/turun) —
  // hanya bereaksi saat MENYEBRANG breakpoint md (mis. rotasi layar),
  // dan kembali ke tab terakhir yang aktif, bukan paksa "chat".
  const isDesktop = window.innerWidth >= 768;
  if (isDesktop === wasDesktop) return;
  wasDesktop = isDesktop;
  if (!isDesktop) switchTab(lastMobileTab);
}
export function handleEnter(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
}

function appendHTML(sender: string, text: string) {
  _appendHTML(sender, text, getChatDeps());
}

function sendMessage() {
  _sendMessage(getChatDeps());
}

function setValue(id, val) {
  const el = $(id);
  if (!el) return;
  let nextValue = val === undefined || val === null ? '' : String(val);
  // Normalisasi tanggal lahir ke YYYY-MM-DD untuk <input type="date">.
  if (id === 'f_tgllahir' && nextValue) {
    const iso = normalizeDateToIso(nextValue);
    if (iso) nextValue = iso;
  }
  if (el.value === nextValue) return;
  // JANGAN TIMPA FIELD YANG SEDANG DIKETIK (bug "ketik 1 huruf, kolom sebelah
  // mental"). updateFormUI() menulis ULANG semua field dari `latestCandidateData`.
  // Handler `input` memang mem-persist tiap ketikan ke state, TAPI ada jeda
  // nyata antara ketikan terakhir dan tulisan state berikutnya (debounce/
  // deferred flush & saveToLocal async). Kalau updateFormUI() jalan di jeda itu
  // — dipicu balasan AI, toggle bahasa, autoPairFill, addArrayItem, atau
  // auto-save — nilai DOM yang lebih baru akan ditimpa balik ke versi state
  // yang lebih lama. Yang dilihat pengguna: teks yang barusan ia ketik HILANG /
  // "mental" saat kursor masih di kolom itu.
  //
  // Aturan: field yang sedang FOKUS adalah sumber kebenaran untuk dirinya
  // sendiri selama pengguna mengetik. Lewati penulisan; nilainya sudah/akan
  // di-persist oleh handler `input`, jadi tidak ada data yang hilang.
  if (document.activeElement === el) return;
  el.value = nextValue;
  el.classList.add('border-amber-500', 'bg-amber-900/30');
  setTimeout(function () {
    el.classList.remove('border-amber-500', 'bg-amber-900/30');
  }, 1500);
}

function renderOptionsHtml(currentVal, opts) {
  let html = '<option value="">' + window.tr('form.ai_f_pilih') + '</option>';
  let found = false;
  opts.forEach(function (o) {
    const v = Array.isArray(o) ? o[0] : o;
    const l = Array.isArray(o) ? o[1] : o;
    if (String(currentVal) === String(v)) {
      found = true;
      html += '<option value="' + escapeHtml(v) + '" selected>' + escapeHtml(l) + '</option>';
    } else html += '<option value="' + escapeHtml(v) + '">' + escapeHtml(l) + '</option>';
  });
  // Nilai lama yang tidak ada di daftar tetap ditampilkan (tidak hilang).
  if (currentVal && !found)
    html =
      '<option value="' +
      escapeHtml(currentVal) +
      '">' +
      escapeHtml(currentVal) +
      '</option>' +
      html;
  return html;
}

// ----------------------------------------------------------------------------
// ANTI-MACET (2026-09-10): renderEditableArray dulu SELALU menulis ulang
// innerHTML tiap updateFormUI() (autofill, balasan chat, toggle bahasa) —
// dropdown yang sedang terbuka ikut dihancurkan → dropdown "macet"/tertutup
// sendiri. Sekarang: (1) signature data dihitung dulu; jika tidak berubah,
// seluruh render DI-SKIP; (2) jika dropdown/select sedang terbuka (open
// combobox) atau pengguna sedang fokus mengetik di kartu, render DITUNDA
// sampai interaksi selesai (deferred render); (3) perubahan satu item hanya
// me-render ulang KARTU item itu (updateArrayCard), bukan seluruh daftar.
// ----------------------------------------------------------------------------
const ARRAY_SNAPSHOT: Record<string, string> = {};
const DEFERRED_RENDER: Record<string, boolean> = {};

function arraySignature(type) {
  const items = latestCandidateData[type];
  const lang = typeof window !== 'undefined' ? (window as any).CURRENT_LANG : '';
  return (items ? JSON.stringify(items) : '') + '|' + lang;
}

function openSelectIn(container: HTMLElement | null) {
  if (!container) return false;
  const sels = container.querySelectorAll('select.input-micro');
  for (let i = 0; i < sels.length; i++) {
    // Kriteria dropdown terbuka: sedang fokus ATAU pengguna sedang menekan
    // (pointer/mouse belum dilepas). :open tidak bisa dibaca lintas browser,
    // fokus + pointerdown adalah proksi paling andal.
    const el = sels[i] as HTMLSelectElement;
    if (document.activeElement === el || (el as any).dataset.pointerHeld === '1') return true;
  }
  return false;
}

// Kartu sedang berinteraksi: ada select terbuka ATAU input/textarea fokus.
function cardBusy(card: HTMLElement) {
  if (openSelectIn(card)) return true;
  const ae = document.activeElement;
  if (ae && card.contains(ae)) {
    const tag = (ae as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  }
  return false;
}

function flushDeferredArrayRender() {
  for (let type in DEFERRED_RENDER) {
    if (!DEFERRED_RENDER[type]) continue;
    DEFERRED_RENDER[type] = false;
    renderEditableArray(type);
  }
}

export function renderEditableArray(type, containerId?) {
  void containerId; // kompatibel pemanggil lama (container di-resolve sendiri)
  const container = $('c_' + type);
  if (!container) return;
  // (1) Data tidak berubah → JANGAN sentuh DOM (dropdown tidak terganggu).
  const sig = arraySignature(type);
  if (ARRAY_SNAPSHOT[type] === sig) return;
  // (2) Dropdown terbuka / pengguna mengetik → tunda render, jangan timpa DOM.
  if (openSelectIn(container) || cardBusy(container)) {
    DEFERRED_RENDER[type] = true;
    return;
  }
  DEFERRED_RENDER[type] = false;
  ARRAY_SNAPSHOT[type] = sig;
  paintArrayCards(type, container);
}

// Render ulang SATU kartu item (dipakai updateArrayField pair-sync) — kartu
// lain, termasuk dropdown yang terbuka di kartu itu, tidak tersentuh.
function updateArrayCard(type, index) {
  const container = $('c_' + type);
  if (!container) return;
  const items = Array.isArray(latestCandidateData[type]) ? latestCandidateData[type] : [];
  const card = container.querySelector('[data-idx="' + index + '"]');
  if (!card || !items[index]) return;
  // JANGAN ganti innerHTML kalau pengguna sedang mengetik di kartu ini.
  // fungsi ini dipanggil dari `oninput` (updateArrayField) TEPAT SAAT mengetik:
  // mengganti grid.innerHTML menghancurkan elemen yang sedang fokus → kursor
  // hilang, teks yang belum ter-render ulang "mental", dan pengguna harus klik
  // lagi tiap 1 huruf. Data sudah tersimpan di state sebelum baris ini, jadi
  // melewati render hanya menunda tampilan (bukan kehilangan data) — dan
  // flushDeferredArrayRender akan menyusul saat blur/change.
  if (card.contains(document.activeElement)) {
    DEFERRED_RENDER[type] = true;
    return;
  }
  const fields = arrayFields[type];
  const inputs = fields
    .map(function (definition) {
      return renderItemField(type, index, items[index], definition);
    })
    .join('');
  const grid = card.querySelector('.grid');
  if (grid) grid.innerHTML = inputs;
  ARRAY_SNAPSHOT[type] = arraySignature(type);
}

function renderItemField(type, index, item, definition) {
  const field = definition[0],
    label = window.tr(definition[1]),
    ctrl = definition[2],
    opts = definition[3];
  const cellOpen = '<div><label class="label-micro">' + label + '</label>';
  if (ctrl === 'select') {
    return (
      cellOpen +
      '<select class="input-micro" onchange="updateArrayField(\'' +
      type +
      "'," +
      index +
      ",'" +
      field +
      '\',this.value)">' +
      renderOptionsHtml(item[field], opts) +
      '</select></div>'
    );
  }
  if (ctrl === 'select-pair') {
    // Dropdown BERPASANGAN: sisi ID & sisi JP sama-sama select dari registry
    // yang sama; onchange mengisi pasangannya otomatis (pair-sync).
    const isJpSide = field.indexOf('_jp') !== -1;
    const cur = String(item[field] || '').trim();
    let html =
      cellOpen +
      '<select class="input-micro' +
      (isJpSide ? ' text-pink-300 font-bold' : '') +
      '" onchange="updateArrayField(\'' +
      type +
      "'," +
      index +
      ",'" +
      field +
      '\',this.value)">';
    html += '<option value="">' + window.tr('form.ai_f_pilih') + '</option>';
    let found = cur === '';
    for (let i = 0; i < opts.length; i++) {
      const val = isJpSide ? opts[i][1] : opts[i][0];
      const lbl = isJpSide ? opts[i][1] + '（' + opts[i][0] + '）' : opts[i][0] + '（' + opts[i][1] + '）';
      const sel = cur === String(val) ? ' selected' : '';
      if (sel) found = true;
      html += '<option value="' + escapeHtml(String(val)) + '"' + sel + '>' + escapeHtml(lbl) + '</option>';
    }
    // Nilai lama di luar registry tetap tampil (tidak hilang) — bisa diperbaiki
    // pengguna lewat dropdown kapan pun.
    if (!found && cur) {
      html += '<option value="' + escapeHtml(cur) + '" selected>' + escapeHtml(cur) + '</option>';
    }
    html += '</select></div>';
    return html;
  }
  if (ctrl === 'years') {
    return (
      cellOpen +
      '<select class="input-micro" onchange="updateArrayField(\'' +
      type +
      "'," +
      index +
      ",'" +
      field +
      '\',this.value)">' +
      yearOptionsHtml(item[field]) +
      '</select></div>'
    );
  }
  if (ctrl === 'month-year') {
    const valStr = String(item[field] || '').trim();
    const parts = valStr.split('-');
    let yr = parts[0] || valStr;
    let mo = parts[1] || '';
    if (yr.length > 4) { yr = valStr; mo = ''; }
    
    const yrHtml = '<select class="input-micro" style="width: 55%; display: inline-block; margin-right: 2%;" onchange="var m=this.nextElementSibling.value; updateArrayField(\'' + type + '\',' + index + ',\'' + field + '\', this.value + (this.value && m ? \'-\' + m : \'\'))">' + yearOptionsHtml(yr) + '</select>';
    const moHtml = '<select class="input-micro" style="width: 43%; display: inline-block;" onchange="var y=this.previousElementSibling.value; updateArrayField(\'' + type + '\',' + index + ',\'' + field + '\', (y ? y : \'\') + (y && this.value ? \'-\' + this.value : \'\'))">' + monthOptionsHtml(mo) + '</select>';

    return cellOpen + yrHtml + moHtml + '</div>';
  }
  if (ctrl === 'datalist') {
    return (
      cellOpen +
      '<input type="text" class="input-micro" list="pekerjaan-options" value="' +
      escapeHtml(item[field]) +
      '" oninput="updateArrayField(\'' +
      type +
      "'," +
      index +
      ",'" +
      field +
      '\',this.value)"></div>'
    );
  }
  return (
    cellOpen +
    '<input type="text" class="input-micro" value="' +
    escapeHtml(item[field]) +
    '" oninput="updateArrayField(\'' +
    type +
    "'," +
    index +
    ",'" +
    field +
    '\',this.value)"></div>'
  );
}

function paintArrayCards(type, container: HTMLElement) {
  const items = Array.isArray(latestCandidateData[type]) ? latestCandidateData[type] : [];
  const fields = arrayFields[type];
  let cards = items
    .map(function (item, index) {
      const inputs = fields
        .map(function (definition) {
          return renderItemField(type, index, item, definition);
        })
        .join('');
      return (
        '<div class="bg-slate-800 p-2 rounded border border-slate-700 text-[9px] mb-1.5" data-idx="' +
        index +
        '"><div class="flex justify-between items-center mb-1"><span class="font-bold text-slate-300">' +
        window.tr('form.ai_f_data') +
        ' ' +
        (index + 1) +
        '</span><button type="button" class="text-rose-300 hover:text-rose-200" onclick="removeArrayItem(\'' +
        type +
        "'," +
        index +
        ')"><i class="fas fa-trash"></i> ' +
        window.tr('form.ai_f_hapus') +
        '</button></div><div class="grid grid-cols-2 gap-1.5">' +
        inputs +
        '</div></div>'
      );
    })
    .join('');
  if (!cards)
    cards =
      '<div class="text-[9px] text-slate-500 italic py-1">' +
      window.tr('form.txt_belum_data') +
      '</div>';
  container.innerHTML =
    cards +
    '<button type="button" class="w-full mt-1 py-1 text-[9px] font-bold rounded border border-dashed border-slate-600 text-slate-300 hover:bg-slate-800" onclick="addArrayItem(\'' +
    type +
    '\')"><i class="fas fa-plus mr-1"></i>' +
    window.tr('form.ai_f_tambah') +
    '</button>';
  // Proksi dropdown-terbuka: tandai pointerdown pada select agar render yang
  // tiba di tengah interaksi tahu harus menunda (lihat openSelectIn).
  container.querySelectorAll('select.input-micro').forEach(function (sel) {
    sel.addEventListener('pointerdown', function () {
      (sel as HTMLElement).dataset.pointerHeld = '1';
    });
    sel.addEventListener('pointerup', function () {
      delete (sel as HTMLElement).dataset.pointerHeld;
    });
    sel.addEventListener('blur', function () {
      delete (sel as HTMLElement).dataset.pointerHeld;
      // Dropdown baru saja ditutup → render tertunda boleh jalan (flush
      // berikutnya via flushDeferredArrayRender / interaksi berikutnya).
      setTimeout(flushDeferredArrayRender, 0);
    });
  });
}

// Auto-pair (2026-09-10): data lama dari database/AI sering hanya punya SATU
// sisi (ID terisi, kanji kosong). Sebelum render, isi pasangan yang masih
// kosong dari registry — kanji JP selalu pas tanpa aksi pengguna, dua arah.
function autoPairFill() {
  let changed = false;
  Object.keys(ARRAY_PAIRS).forEach(function (k) {
    const parts = k.split('.');
    const type = parts[0];
    const field = parts[1];
    const pr = ARRAY_PAIRS[k];
    const items = latestCandidateData[type];
    if (!Array.isArray(items)) return;
    items.forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      const src = String(it[field] || '').trim();
      if (!src) return;
      const dst = String(it[pr.partner] || '').trim();
      if (dst) return; // pasangan sudah terisi — jangan timpa
      const val = pr.dir === 'id' ? pairJpOf(pr.pairs, src) : pairIdOf(pr.pairs, src);
      if (val) {
        it[pr.partner] = val;
        changed = true;
      }
    });
  });
  Object.keys(PAIRED_PARTNER).forEach(function (path) {
    const partner = PAIRED_PARTNER[path];
    const pairs = PAIRED_PARS[path];
    if (!pairs) return;
    const idVal = String(getByPath(latestCandidateData, path) || '').trim();
    const jpCur = String(getByPath(latestCandidateData, partner) || '').trim();
    if (idVal && !jpCur) {
      const jp = pairJpOf(pairs, idVal);
      if (jp) {
        setByPath(latestCandidateData, partner, jp);
        changed = true;
      }
    } else if (!idVal && jpCur) {
      const id = pairIdOf(pairs, jpCur);
      if (id) {
        setByPath(latestCandidateData, path, id);
        changed = true;
      }
    }
  });
  if (changed) saveToLocal();
}

export function updateFormUI() {
  latestCandidateData =
    latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
  autoPairFill();
  Object.keys(fieldPaths).forEach(function (id) {
    const pairSel = STATIC_PAIR_SELECTS[id];
    if (pairSel) {
      // Field sudah jadi select pasangan — refresh opsinya dari data, bukan
      // setValue (yang menulis .value pada input readonly yang sudah diganti).
      if (pairSel.isSize) {
        (pairSel.sel as any).refreshSize();
      } else {
        (pairSel.sel as any).refreshPairs();
      }
      return;
    }
    setValue(id, getByPath(latestCandidateData, fieldPaths[id]));
  });
  // Sinkronisasi umur dari tanggal lahir + visibility SIM/Paspor.
  syncUmurFromTglLahir();
  syncSimPasporVisibility();
  renderEditableArray('pendidikan', 'c_pendidikan');
  renderEditableArray('pekerjaan', 'c_pekerjaan');
  renderEditableArray('keluarga', 'c_keluarga');

  // --- MUNCULKAN FOTO LAMA DARI DATABASE ---
  const photoUrl = latestCandidateData.pas_photo || getByPath(latestCandidateData, 'uploads.photo');
  const imgPreview = $('previewFoto');

  // Jika ada URL foto di database, BUKAN tanda strip, dan pelamar belum upload foto baru
  if (photoUrl && photoUrl !== '-' && !currentPhotoBase64 && imgPreview) {
    // Foto di Supabase Storage - langsung dirender.
    imgPreview.src = photoUrl;
    imgPreview.classList.remove('hidden');
  }
  // ------------------------------------------------------

  // --- TAMPILKAN BERKAS YANG SUDAH PERNAH UPLOAD DARI DATABASE ---
  // (kecuali user sudah pilih file baru di sesi ini — kalau mau nimpa file
  //  lama, tinggal pilih file baru; kalau tidak, status lama tetap tampil)
  [
    ['jft', 'status_jft', !!currentJftBase64],
    ['ssw', 'status_ssw', !!currentSswBase64],
    ['ktp', 'status_ktp', !!currentKtpFile],
    ['kk', 'status_kk', !!currentKkFile],
    ['ijazahSd', 'status_ijazahSd', !!currentIjazahSdFile],
    ['ijazahSmp', 'status_ijazahSmp', !!currentIjazahSmpFile],
    ['ijazahSma', 'status_ijazahSma', !!currentIjazahSmaFile],
    ['univ', 'status_univ', !!currentUnivFile],
  ].forEach(function (pair) {
    const key = pair[0] as string,
      statusId = pair[1] as string,
      sudahPilihBaru = pair[2] as boolean;
    const url = getByPath(latestCandidateData, 'uploads.' + key);
    const statusEl = $(statusId);
    if (!statusEl || sudahPilihBaru) return;
    if (url && url !== '-') {
      const namaFile = escapeHtml((url.split('/').pop() || key.toUpperCase()).replace(/_+/g, ' '));
      statusEl.innerHTML =
        '<i class="fas fa-check-circle"></i> ' +
        window.tr('form.ai_status_existing') +
        ': ' +
        '<a href="' +
        escapeHtml(url) +
        '" target="_blank" rel="noopener" class="underline hover:text-amber-300">' +
        namaFile +
        '</a>';
      statusEl.classList.remove('hidden');
    }
  });
  // ------------------------------------------------------
}

export function aiFormCompressImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  // Guard seragam: format (image/*) + ukuran maks 10 MB — pesan jelas + reset.
  if (!window.cekUploadFile(event.target, { maxMb: 10 })) return;
  const status = $('compressStatus'),
    preview = $('previewFoto');
  status.classList.remove('hidden');
  status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + window.tr('form.ai_f_proses');
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function (e) {
    const img = new Image();
    img.src = e.target?.result as string;
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let w = img.width;
      let h = img.height;
      const MAX = 600;
      if (w > h && w > MAX) {
        h *= MAX / w;
        w = MAX;
      } else if (h > MAX) {
        w *= MAX / h;
        h = MAX;
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      preview.src = dataUrl;
      preview.classList.remove('hidden');
      status.innerHTML = '<i class="fas fa-check-circle"></i> ' + window.tr('form.ai_f_berhasil');
      currentPhotoBase64 = dataUrl.split(',')[1];
      saveToLocal();
    };
  };
}

export function handleDocUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  // Guard seragam: format sesuai accept + ukuran maks 3 MB — pesan jelas + reset.
  if (!window.cekUploadFile(event.target, { maxMb: 3 })) return;
  const statusEl = $('status_' + type);
  statusEl.classList.remove('hidden');
  statusEl.innerHTML =
    '<i class="fas fa-spinner fa-spin text-amber-400"></i> ' + window.tr('form.ai_f_membaca');
  // Downscale scan gambar dulu; pdf & gagal-decode dibiarkan utuh oleh helper.
  downscaleScanImage(file, 800, 0.8, function (hasil) {
    if (type === 'jft') {
      currentJftBase64 = hasil.data;
      currentJftFile = hasil;
    }
    if (type === 'ssw') {
      currentSswBase64 = hasil.data;
      currentSswFile = hasil;
    }
    if (type === 'ktp') {
      currentKtpFile = hasil;
    }
    if (type === 'kk') {
      currentKkFile = hasil;
    }
    if (type === 'ijazahSd') {
      currentIjazahSdFile = hasil;
    }
    if (type === 'ijazahSmp') {
      currentIjazahSmpFile = hasil;
    }
    if (type === 'ijazahSma') {
      currentIjazahSmaFile = hasil;
    }
    if (type === 'univ') {
      currentUnivFile = hasil;
    }
    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> File: ' + hasil.name;
    saveToLocal();
  });
}

async function uploadFilesDirectlyBase64(filesObj, folder) {
  const toUpload = Object.keys(filesObj).filter(function (k) {
    return filesObj[k] && filesObj[k].data;
  });
  if (toUpload.length === 0) return {};

  // Upload LANGSUNG ke Cloudinary: base64 hasil downscaleScanImage diubah
  // kembali jadi File, lalu dikirim ke Cloudinary. Backend hanya menerima
  // string URL hasil upload (tidak ada lagi getUploadUrls / Supabase).
  const uploadPromises = toUpload.map(function(key) {
    const file = filesObj[key];
    const blob = base64ToBlob(file.data, file.mime);
    const f = new File([blob], file.name || key + '.jpg', {
      type: file.mime || 'application/octet-stream',
    });
    return uploadToCloudinary(f, {}).then(function(url) { return { key: key, url: url }; });
  });
  const results = await Promise.all(uploadPromises);
  const uploadedUrls: Record<string, any> = {};
  results.forEach(function(r) { uploadedUrls[r.key] = r.url; });
  return uploadedUrls;
}

export async function saveToDatabase() {
  const btn = $('btnSaveDB');
  latestCandidateData =
    latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
  // Jaring penyaman: kalau state nama kosong padahal siswa sudah mengetiknya
  // di field form (mis. autofill dari database menimpa state setelah input),
  // pakai nilai yang terlihat di layar — jangan batalkan penyimpanan.
  const namaDom = $('f_nama');
  if (!latestCandidateData.identitas || !latestCandidateData.identitas.nama_lengkap) {
    if (namaDom && String(namaDom.value || '').trim()) {
      setByPath(latestCandidateData, 'identitas.nama_lengkap', String(namaDom.value).trim());
    }
  }
  // FIX (2026-09-02, laporan "pencet SIMPAN DB tidak ada tulisan sama sekali"):
  // halaman standalone tidak punya #toast-container, jadi showToast() diam saja
  // dan semua pesan hilang (sudah diperbaiki di js/init/util.ts — showToast
  // sekarang membuat wadahnya sendiri). Di sini ditambah jejak console supaya
  // kalau pesan tetap tidak terbaca, penyebabnya bisa dilihat dari DevTools.
  if (!latestCandidateData.identitas || !latestCandidateData.identitas.nama_lengkap) {
    console.warn('[saveToDatabase] dibatalkan: identitas.nama_lengkap masih kosong');
    window.showToast(window.tr('form.ai_empty_chat_hint'), 'error');
    // Tandai field nama supaya jelas apa yang kurang (bukan hanya toast).
    const namaEl = $('f_nama');
    if (namaEl) {
      namaEl.classList.remove('border-sky-400');
      namaEl.classList.add('border-rose-500');
      try {
        namaEl.focus();
      } catch (e) {
        /* fokus gagal (mis. keyboard belum muncul) — tidak fatal */
      }
    }
    if (window.innerWidth < 768) switchTab('chat');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + window.tr('form.ai_saving_db') + '…';

  // Guard ekstensi: cek SEMUA file dokumen SEBELUM kirim — format baku
  // (2026-09-10, rev): JFT/SSW wajib PDF; KTP/KK/ijazah/UNIV boleh foto HP
  // (JPG/PNG — otomatis di-downscale handleDocUpload) ATAU PDF. Pas foto
  // sudah dijamin JPG/PNG oleh compressImage (canvas). Sinkron dengan
  // aturan per-prefix di storage-helper.ts.
  const extCheck = [
    { f: currentJftFile, t: 'doc' },
    { f: currentSswFile, t: 'doc' },
    { f: currentKtpFile, t: 'foto' },
    { f: currentKkFile, t: 'foto' },
    { f: currentIjazahSdFile, t: 'foto' },
    { f: currentIjazahSmpFile, t: 'foto' },
    { f: currentIjazahSmaFile, t: 'foto' },
    { f: currentUnivFile, t: 'foto' },
  ].filter(function (x) {
    return !!x.f;
  });
  for (let ei = 0; ei < extCheck.length; ei++) {
    const nm = String(extCheck[ei].f.name || '')
      .split('.')
      .pop()
      .toLowerCase();
    const ok = extCheck[ei].t === 'foto' ? ['pdf', 'jpg', 'jpeg', 'png'] : ['pdf'];
    if (ok.indexOf(nm) === -1) {
      btn.disabled = false;
      btn.innerHTML = window.tr('form.ai_save_db');
      window.showToast(
        window.tr('form.ai_ext_check_bad').replace('{file}', extCheck[ei].f.name || 'file'),
        'error',
      );
      return;
    }
  }

  try {
    const folderName =
      'master/' +
      latestCandidateData.identitas.nama_lengkap.toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
    const filesToUpload = {
      fotoFile: currentPhotoBase64
        ? { data: currentPhotoBase64, name: 'PAS_PHOTO.jpg', mime: 'image/jpeg' }
        : null,
      jftFile: currentJftFile,
      sswFile: currentSswFile,
      ktpFile: currentKtpFile,
      kkFile: currentKkFile,
      ijazahSdFile: currentIjazahSdFile,
      ijazahSmpFile: currentIjazahSmpFile,
      ijazahSmaFile: currentIjazahSmaFile,
      univFile: currentUnivFile,
    };
    btn.innerHTML = '<i class="fas fa-cloud-upload-alt fa-spin"></i> Mengunggah dokumen...';
    const uploadedUrls = await uploadFilesDirectlyBase64(filesToUpload, folderName);

    const payload = {
      identitas: latestCandidateData.identitas,
      fisik: latestCandidateData.fisik,
      medis: latestCandidateData.medis,
      pendidikan: latestCandidateData.pendidikan,
      pekerjaan: latestCandidateData.pekerjaan,
      sertifikasi: latestCandidateData.sertifikasi,
      keluarga: latestCandidateData.keluarga,
      wawancara: latestCandidateData.wawancara,
      context: formContext,
      fotoFile: uploadedUrls.fotoFile || null,
      jftFile: uploadedUrls.jftFile || null,
      sswFile: uploadedUrls.sswFile || null,
      ktpFile: uploadedUrls.ktpFile || null,
      kkFile: uploadedUrls.kkFile || null,
      ijazahSdFile: uploadedUrls.ijazahSdFile || null,
      ijazahSmpFile: uploadedUrls.ijazahSmpFile || null,
      ijazahSmaFile: uploadedUrls.ijazahSmaFile || null,
      univFile: uploadedUrls.univFile || null,
    };

    btn.innerHTML = '<i class="fas fa-paper-plane fa-spin"></i> Menyimpan data...';
    try {
      const res = await withRetry(function() { return window.callAPI('submitDataAsj', payload); }, 2, 2000);
      btn.disabled = false;
      if (res.success) {
        btn.innerHTML = '<i class="fas fa-check"></i> ' + window.tr('form.ai_save_success_btn');
        btn.classList.replace('bg-emerald-600', 'bg-sky-600');
        window.showToast(window.tr('form.ai_save_success'), 'success');
      } else {
        window.showToast(window.tr('form.ai_save_failed') + ' ' + (res.message || ''), 'error');
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> ' + window.tr('form.ai_save_db');
      }
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML =
        '<i class="fas fa-cloud-upload-alt"></i> ' + window.tr('form.ai_save_db');
      console.error('[saveToDatabase] submitDataAsj gagal:', err);
      window.showToast(window.tr('form.ai_save_failed') + ' ' + (err.message || ''), 'error');
    }
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> ' + window.tr('form.ai_save_db');
    console.error('[saveToDatabase] upload dokumen gagal:', e);
    window.showToast(window.tr('form.ai_upload_failed') + ' ' + (e.message || ''), 'error');
  }
}

// Bridge ESM→legacy (Fase 3 langkah 13): HTML onclick/onchange/onload +
// string onclick dinamis dari renderEditableArray tetap butuh global —
// kini SEMUA alias seam HTML diregistrasikan TERPUSAT via
// registerSeamAliases (js/core/bridge.js).
registerSeamAliases({
  initApp: aiFormInitApp,
  switchTab,
  handleEnter,
  sendMessage,
  updateFormUI,
  compressImage: aiFormCompressImage,
  handleDocUpload,
  saveToDatabase,
  updateArrayField,
  removeArrayItem,
  addArrayItem,
});
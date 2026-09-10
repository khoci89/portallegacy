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

// FASE 3/4: dulu diisi server (GAS scriptlet) saat halaman dibuka dari
// Portal ASJ. Sekarang dibaca dari query string URL (?flow=&job=&bidang=&wa=&nama=)
// - persis parameter yang sama, cuma sumbernya URL bukan server-side render.
(function () {
  function cleanPhoneJS(wa) {
    if (!wa) return '';
    var s = String(wa).replace(/\D/g, '');
    if (s.startsWith('0')) s = '62' + s.substring(1);
    else if (s.startsWith('8')) s = '62' + s;
    return s;
  }
  var p = new URLSearchParams(window.location.search);
  var flow = (p.get('flow') || 'master').toLowerCase() === 'apply' ? 'apply' : 'master';
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
var chatHistory = [];
var latestCandidateData: Record<string, any> = {};
var currentPhotoBase64 = '';
var currentJftBase64 = '';
var currentSswBase64 = '';
var currentJftFile = null;
var currentSswFile = null;
var currentKtpFile = null;
var currentKkFile = null;
var currentIjazahSdFile = null;
var currentIjazahSmpFile = null;
var currentIjazahSmaFile = null;
var currentUnivFile = null;
var urlLogo =
  'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/logo_asj.png';
var urlJeklin =
  'https://gdwvffmevwtwnzrapjwy.supabase.co/storage/v1/object/public/asj-files/assets/jeklin.png';
var formContext: Record<string, any> = window.AI_FORM_CONTEXT || {};
var fieldPaths = {
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
var TINGKAT_OPTIONS = ['SD', 'SMP', 'SMA/SMK', 'D3/S1', 'LPK BAHASA'];
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
  pairJpOf,
  pairIdOf,
} from '../../shared/silsilah.ts';
// Keluarga (silsilah lengkap): ayah/ibu/suami/istri/anak/kakak/adik ×
// laki-laki/perempuan, plus cucu, kakek-nenek, mertua, ipar, keponakan.
// Pekerjaan keluarga & kenalan, jabatan kerja, kenalan JP — lihat silsilah.ts.
// Dropdown statis (kartu identitas) — pasangan [nilai tersimpan, label kanji].
// Nilai mengikuti bentuk yang sudah tersimpan di master (lihat buildMasterNested
// & Rirekisho: LAKI-LAKI/PEREMPUAN, ISLAM, BELUM MENIKAH, dsb.).
var IDENTITAS_PAIRS = {
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
  riwayat_jepang: [
    ['BELUM PERNAH', '未経験'],
    ['PERNAH MAGANG', '技能実習経験'],
    ['PERNAH TOKUTEI GINO', '特定技能経験'],
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
var FIELD_PAIRS = {
  'identitas.gender': IDENTITAS_PAIRS.gender,
  'identitas.agama': IDENTITAS_PAIRS.agama,
  'identitas.golongan_darah': IDENTITAS_PAIRS.golongan_darah,
  'identitas.status_nikah': IDENTITAS_PAIRS.status_nikah,
  'identitas.tangan_dominan': IDENTITAS_PAIRS.tangan_dominan,
  'identitas.sim': [
    ['TIDAK ADA', '無し'],
    ['SIM A', '普通自動車'],
    ['SIM B', '大型自動車'],
    ['SIM C', '準中型自動車'],
  ],
  'wawancara.riwayat_jepang': IDENTITAS_PAIRS.riwayat_jepang,
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

// Pencari pasangan (pairJpOf/pairIdOf) di-import dari js/silsilah.ts —
// SATU implementasi untuk frontend & backend (tanpa duplikat).
// Sinkronkan pasangan DUA ARAH di objek data: set path -> value, lalu isi
// path partner (bila ada di PAIRED_PARTNER) dengan pasangannya — HANYA jika
// partner masih kosong atau nilainya tidak cocok, dan hanya jika pasangan
// ditemukan di registry. Nilai bebas (di luar registry) tidak pernah ditimpa.
var PAIRED_PARTNER: Record<string, string> = {
  'identitas.gender': 'identitas.gender_jp',
  'identitas.agama': 'identitas.agama_jp',
  'identitas.status_nikah': 'identitas.status_nikah_jp',
  'wawancara.riwayat_jepang': 'wawancara.riwayat_jepang_jp',
  'kenalan_jepang.hubungan_id': 'kenalan_jepang.hubungan_jp',
  'kenalan_jepang.pekerjaan_id': 'kenalan_jepang.pekerjaan_jp',
};
var PAIRED_PARTNER_JP: Record<string, string> = {
  'identitas.gender_jp': 'identitas.gender',
  'identitas.agama_jp': 'identitas.agama',
  'identitas.status_nikah_jp': 'identitas.status_nikah',
  'wawancara.riwayat_jepang_jp': 'wawancara.riwayat_jepang',
  'kenalan_jepang.hubungan_jp': 'kenalan_jepang.hubungan_id',
  'kenalan_jepang.pekerjaan_jp': 'kenalan_jepang.pekerjaan_id',
};
var PAIRED_PARS: Record<string, Array<any>> = {
  'identitas.gender': IDENTITAS_PAIRS.gender,
  'identitas.gender_jp': IDENTITAS_PAIRS.gender,
  'identitas.agama': IDENTITAS_PAIRS.agama,
  'identitas.agama_jp': IDENTITAS_PAIRS.agama,
  'identitas.status_nikah': IDENTITAS_PAIRS.status_nikah,
  'identitas.status_nikah_jp': IDENTITAS_PAIRS.status_nikah,
  'wawancara.riwayat_jepang': IDENTITAS_PAIRS.riwayat_jepang,
  'wawancara.riwayat_jepang_jp': IDENTITAS_PAIRS.riwayat_jepang,
  'kenalan_jepang.hubungan_id': KENALAN_PAIRS,
  'kenalan_jepang.hubungan_jp': KENALAN_PAIRS,
  'kenalan_jepang.pekerjaan_id': PEKERJAAN_PAIRS,
  'kenalan_jepang.pekerjaan_jp': PEKERJAAN_PAIRS,
};
function setPairedValue(path, value) {
  setByPath(latestCandidateData, path, value);
  var partnerPath = PAIRED_PARTNER[path] || PAIRED_PARTNER_JP[path];
  var pairs = PAIRED_PARS[path];
  if (!partnerPath || !pairs) return;
  var isId = !path.endsWith('_jp') && !path.endsWith('.pekerjaan_jp');
  var partnerVal = isId ? pairJpOf(pairs, value) : pairIdOf(pairs, value);
  if (!partnerVal) return; // nilai bebas di luar registry — partner dibiarkan
  var cur = String(getByPath(latestCandidateData, partnerPath) || '').trim();
  if (cur && cur !== partnerVal) {
    // Partner sudah terisi beda: timpa HANYA kalau partner adalah hasil
    // pair registry lain (tak mungkin beda kalau konsisten) — pilih aman:
    // timpa supaya selalu berpasangan (permintaan user: kanji harus pas).
    void cur;
  }
  setByPath(latestCandidateData, partnerPath, partnerVal);
}
var arrayFields = {
  pendidikan: [
    ['tingkat', 'form.ai_f_tingkat', 'select', TINGKAT_OPTIONS],
    ['sekolah_id', 'form.ai_f_sekolah_id'],
    ['sekolah_jp', 'form.ai_f_sekolah_jp'],
    ['jurusan_id', 'form.ai_f_jurusan_id'],
    ['jurusan_jp', 'form.ai_f_jurusan_jp'],
    ['masuk', 'form.ai_f_masuk', 'years'],
    ['lulus', 'form.ai_f_lulus', 'years'],
  ],
  pekerjaan: [
    ['perusahaan_id', 'form.ai_f_perusahaan_id'],
    ['perusahaan_jp', 'form.ai_f_perusahaan_jp'],
    ['jabatan_id', 'form.ai_f_jabatan_id', 'select-pair', JABATAN_PAIRS],
    ['jabatan_jp', 'form.ai_f_jabatan_jp', 'select-pair', JABATAN_PAIRS],
    ['masuk', 'form.ai_f_mulai', 'years'],
    ['keluar', 'form.ai_f_selesai', 'years'],
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
var ARRAY_PAIRS: Record<string, any> = {
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
  var now = new Date().getFullYear();
  var html = '<option value="">' + window.tr('form.ai_f_pilih') + '</option>';
  var found = String(current || '').trim() !== '';
  for (var y = now; y >= now - 60; y--) {
    if (String(current) === String(y)) found = true;
    html += '<option value="' + y + '"' + (String(current) === String(y) ? ' selected' : '') + '>' + y + '</option>';
  }
  // Nilai tahun lama di luar rentang tetap ditampilkan (tidak hilang).
  if (!found && String(current || '').trim() !== '') {
    html += '<option value="' + escapeHtml(String(current)) + '" selected>' + escapeHtml(String(current)) + '</option>';
  }
  return html;
}

function getByPath(source, path) {
  return path.split('.').reduce(function (value, key) {
    return value && value[key] !== undefined ? value[key] : '';
  }, source || {});
}

function setByPath(target, path, value) {
  var keys = path.split('.'),
    cursor = target;
  keys.slice(0, -1).forEach(function (key) {
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
}
function mergeCandidateData(current, incoming) {
  if (Array.isArray(incoming)) {
    var currentArray = Array.isArray(current) ? current : [];
    if (!incoming.length) return currentArray.slice();
    var mergedArray = incoming.map(function (item, index) {
      return mergeCandidateData(currentArray[index], item);
    });
    return mergedArray.concat(currentArray.slice(incoming.length));
  }
  if (incoming && typeof incoming === 'object') {
    var base = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
    var result: Record<string, any> = {};
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

function enableManualPreview() {
  document
    .querySelectorAll('#formPanel input[readonly], #formPanel textarea[readonly]')
    .forEach(function (el) {
      el.removeAttribute('readonly');
      el.setAttribute('title', window.tr('form.ai_f_tooltip'));
    });
  Object.keys(fieldPaths).forEach(function (id) {
    var el = $(id);
    if (!el || el.dataset.manualBound) return;
    el.dataset.manualBound = 'true';
    el.addEventListener('input', function () {
      latestCandidateData =
        latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
      setByPath(latestCandidateData, fieldPaths[id], el.value);
      el.classList.add('border-sky-400');
      saveToLocal();
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
    var id = Object.keys(fieldPaths).find(function (k) {
      return fieldPaths[k] === path;
    });
    if (!id) return;
    var orig = $(id);
    if (!orig || orig.dataset.pairBound) return;
    orig.dataset.pairBound = '1';
    var pairs = FIELD_PAIRS[path];
    var isJp = /_jp$/.test(path);
    var sel = document.createElement('select');
    sel.className = orig.className;
    sel.dataset.pairSel = path;
    sel.onchange = function () {
      applyStaticPair(path, (sel as HTMLSelectElement).value);
    };
    // Fungsi refresh opsi — dipanggil updateFormUI supaya select mengikuti
    // nilai terbaru (dari chat AI/database) dan bahasa label aktif.
    (sel as any).refreshPairs = function () {
      var cur = String(getByPath(latestCandidateData, path) || '').trim();
      var html = '<option value="">' + window.tr('form.ai_f_pilih') + '</option>';
      var found = cur === '';
      for (var i = 0; i < pairs.length; i++) {
        var val = isJp ? pairs[i][1] : pairs[i][0];
        var lbl = isJp ? pairs[i][1] + '（' + pairs[i][0] + '）' : pairs[i][0] + '（' + pairs[i][1] + '）';
        var isSel = cur === String(val);
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
var STATIC_PAIR_SELECTS: Record<string, any> = {};

// Flush render tertunda saat interaksi teks selesai (input blur) — dropdown
// tidak pernah ditimpa di tengah pemakaian.
function bindDeferredFlush() {
  ['c_pendidikan', 'c_pekerjaan', 'c_keluarga'].forEach(function (cid) {
    var c = $(cid);
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
  var pr = ARRAY_PAIRS[type + '.' + field];
  if (pr && value) {
    var partnerVal = pr.dir === 'id' ? pairJpOf(pr.pairs, value) : pairIdOf(pr.pairs, value);
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
  var item: Record<string, any> = {};
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
  var wa = String(formContext.wa || 'baru').replace(/\D/g, '');
  var job = String(formContext.job || formContext.flow || 'master').replace(/[^a-z0-9_-]/gi, '_');
  return 'asj_qween_cv_data_' + wa + '_' + job;
}

function applyPortalContext() {
  latestCandidateData =
    latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
  var identitas = latestCandidateData.identitas || {};
  if (!identitas.nama_lengkap && formContext.nama)
    setByPath(latestCandidateData, 'identitas.nama_lengkap', formContext.nama);
  if (!identitas.hp && formContext.wa)
    setByPath(latestCandidateData, 'identitas.hp', formContext.wa);

  var label =
    formContext.flow === 'apply'
      ? 'Lamaran ' + (formContext.job || 'umum') + ' tersambung ke portal.'
      : 'CV Master tersambung ke profil portal.';
  if ($('formModeLabel')) $('formModeLabel').textContent = label;
}

// SYNC with backend: netlify/functions/_lib/ai/chat.ts isVipCatatan()
// Old regex /\[(?:KELAS\s*[A-Z0-9]+|[A-Z0-9]+)\]/i matched ANY bracketed
// tag ([MCU], [VISA], [NOTE]) — too broad. Tightened to [VIP] + [KELAS ...] only.
function isVipCatatan(catatan) {
  var c = catatan || '';
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
  return window
    .callAPI('getAppData', ['kandidat', targetWa])
    .then(function (res) {
      if (res && res.sessionInvalid) return true; // tidak bisa diverifikasi → jangan redirect
      // Respons backend rebuild menaruh data kandidat di res.candidates[0]
      // (dulu myData di backend GAS lama). Ambil catatanInt dari sana agar
      // kandidat VIP tidak salah redirect ke Form Master.
      var cand = res && Array.isArray(res.candidates) ? res.candidates[0] : null;
      var catatan = cand ? String(cand.catatanInt || cand.catatan || '') : '';
      if (!catatan && res && res.myData) catatan = String(res.myData.catatanInt || '');
      return isVipCatatan(catatan);
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
            var aiParsed = JSON.parse(masterData.AIDATAJSON);
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
          var smartWelcome = generateSmartWelcomeMessage(latestCandidateData);
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
export function initApp() {
  $('logoAsj').src = urlLogo;
  // Terjemahkan label statis sesuai bahasa terpilih (asj_lang).
  if (typeof window.renderLanguageLight === 'function') {
    window.renderLanguageLight();
    var lb = document.getElementById('lang-btn-ai');
    if (lb) lb.textContent = window.CURRENT_LANG === 'jp' ? 'ID' : 'JP';
  }
  // Select pasangan menggantikan input identitas/kenalan tertentu SEBELUM
  // updateFormUI pertama (dipasang sekali — idempotent via dataset.pairBound).
  enableStaticPairSelects();
  bindDeferredFlush();
  // Select pasangan menggantikan input identitas/kenalan tertentu SEBELUM
  // updateFormUI pertama (dipasang sekali — idempotent via dataset.pairBound).
  enableStaticPairSelects();
  bindDeferredFlush();
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

  var saved = localStorage.getItem(getStorageKey());
  if (saved) {
    try {
      var parsed = JSON.parse(saved);
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
      localStorage.removeItem(getStorageKey());
    }
  }

  applyPortalContext();

  // AUTO-FILL SPREADSHEET & SAPAAN PINTAR JEKLIN
  var targetWa =
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
  var id = (data && data.identitas) || {};
  var fs = (data && data.fisik) || {};
  var iv = (data && data.wawancara) || {};
  var nama = id.panggilan || id.nama_lengkap || formContext.nama || '';

  if (nama) {
    // Deteksi daftar bidang yang masih kosong
    var missing = [];
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

    var welcomeText = window.tr('form.chat_welcome_named_intro').replace('{nama}', nama);

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
  var welcome = window.tr('form.chat_welcome_nameless');
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
    localStorage.setItem(
      getStorageKey(),
      JSON.stringify({
        chatHistory: chatHistory,
        latestCandidateData: latestCandidateData,
        currentPhotoBase64: currentPhotoBase64,
      }),
    );
  } catch (error) {
    console.warn('Penyimpanan lokal penuh; data teks tetap tersimpan di halaman saat ini.', error);
  }
}

// Tab terakhir yang aktif di layar < 768px + status desktop/mobile.
// Dipakai handleResize supaya rotasi layar kembali ke tab yang dipilih,
// TANPA memaksa pindah tab saat iPhone memicu "resize" tiap scroll
// (URL bar Safari naik/turun) — penyebab kolom chat "puter-puter".
var lastMobileTab = 'chat';
var wasDesktop = window.innerWidth >= 768;
export function switchTab(target) {
  lastMobileTab = target;
  if (window.innerWidth >= 768) return;
  var cPanel = $('chatPanel'),
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
  var isDesktop = window.innerWidth >= 768;
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

function appendHTML(sender, text) {
  var isUser = sender === 'user';
  var cleanText = escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  // --- LOGIKA BARU: CEK FOTO KANDIDAT ---
  var userIcon = '<i class="fas fa-user"></i>'; // Icon default (jika belum ada foto)

  // Jika kandidat baru saja upload foto di sesi ini
  if (typeof currentPhotoBase64 !== 'undefined' && currentPhotoBase64) {
    userIcon =
      '<img src="data:image/jpeg;base64,' +
      currentPhotoBase64 +
      '" alt="" class="w-full h-full object-cover" onerror="this.outerHTML=\'<i class=&quot;fas fa-user&quot;></i>\'">';
  }
  // Jika kandidat sudah punya foto lama dari database
  else {
    var imgPreview = document.getElementById('previewFoto');
    if (
      imgPreview &&
      imgPreview.src &&
      imgPreview.src.length > 20 &&
      !imgPreview.classList.contains('hidden')
    ) {
      userIcon =
        '<img src="' +
        imgPreview.src +
        '" alt="" class="w-full h-full object-cover" onerror="this.outerHTML=\'<i class=&quot;fas fa-user&quot;></i>\'">';
    }
  }
  // --------------------------------------

  var aiIcon =
    '<img src="' + urlJeklin + '" alt="" class="w-full h-full object-cover rounded-full">';

  // Perhatikan tambahan class 'overflow-hidden' agar fotonya menjadi bulat sempurna
  var htmlStr =
    '<div class="flex gap-2 ' +
    (isUser ? 'flex-row-reverse' : '') +
    ' fade-in">' +
    '<div class="w-8 h-8 rounded-full overflow-hidden ' +
    (isUser ? 'bg-sky-500' : 'bg-amber-500 p-0.5') +
    ' flex-shrink-0 flex items-center justify-center text-xs text-white shadow">' +
    (isUser ? userIcon : aiIcon) +
    '</div>' +
    '<div class="bg-slate-800 p-2.5 rounded-xl ' +
    (isUser
      ? 'rounded-tr-none text-sky-100 bg-sky-900/40 border border-sky-800'
      : 'rounded-tl-none text-slate-200 border border-slate-700') +
    ' text-[11px] md:text-xs max-w-[85%] shadow leading-relaxed whitespace-pre-wrap">' +
    cleanText +
    '</div>' +
    '</div>';

  $('chatBox').innerHTML += htmlStr;
  setTimeout(function () {
    $('chatBox').scrollTop = $('chatBox').scrollHeight;
  }, 100);
}

export function sendMessage() {
  var inputEl = $('userInput'),
    btnEl = $('sendBtn');
  var text = inputEl.value.trim();
  if (!text) return;

  appendHTML('user', text);
  inputEl.value = '';
  chatHistory.push({ role: 'user', content: text });
  saveToLocal();

  inputEl.disabled = true;
  btnEl.disabled = true;

  // PERBAIKAN: Ubah teks loading saat chat dikirim agar tidak "tersangkut" teks lama
  $('aiTypingStatus').innerHTML =
    '<i class="fas fa-magic fa-spin mr-2"></i> ' + window.tr('form.ai_chat_typing');
  $('aiTypingStatus').classList.remove('hidden');

  // FIX: Trim history to last 20 messages to avoid Gemini token limit
  var trimmedHistory = chatHistory.slice(-20);
  var payloadToAI = {
    flow: formContext.flow,
    history: trimmedHistory,
    currentData: latestCandidateData,
    lang: typeof window.CURRENT_LANG !== 'undefined' ? window.CURRENT_LANG : 'id',
  };

  withRetry(function() {
      return window.callAPI('processAIChat', payloadToAI);
    }, 2, 2000)
    .then(function (res) {
      inputEl.disabled = false;
      btnEl.disabled = false;
      inputEl.focus();
      $('aiTypingStatus').classList.add('hidden');

      // Lock VIP di-enforce SERVER (AGENTS.md §6) — kalau action dipanggil
      // langsung tanpa sesi admin & kandidat non-VIP, tampilkan pesan lock.
      if (res.success === false) {
        appendHTML('ai', res.error || window.tr('ui.toast_ai_cv_locked'));
        return;
      }

      if (res.reply) {
        var finalReply = res.reply;
        if (typeof res.reply === 'string' && res.reply.startsWith('{')) {
          try {
            var p = JSON.parse(res.reply.replace(/\n/g, '\\n'));
            if (p.reply) {
              finalReply = p.reply;
            }
            if (p.data) {
              res.data = Object.assign({}, res.data, p.data);
            }
          } catch (e) {
            var match = res.reply.match(/"reply"\s*:\s*"([^]*?)"\s*,/);
            if (match && match[1]) {
              finalReply = match[1];
            }
          }
        }
        appendHTML('ai', finalReply);
        chatHistory.push({
          role: 'assistant',
          content: typeof res === 'string' ? res : JSON.stringify(res),
        });
      }
      if (res.data) {
        latestCandidateData = mergeCandidateData(latestCandidateData, res.data);
        updateFormUI();
      }
      saveToLocal();
    })
    .catch(function (err) {
      inputEl.disabled = false;
      btnEl.disabled = false;
      $('aiTypingStatus').classList.add('hidden');
      appendHTML('ai', window.tr('form.ai_chat_error'));
    });
}

function setValue(id, val) {
  var el = $(id);
  if (!el) return;
  var nextValue = val === undefined || val === null ? '' : String(val);
  if (el.value === nextValue) return;
  el.value = nextValue;
  el.classList.add('border-amber-500', 'bg-amber-900/30');
  setTimeout(function () {
    el.classList.remove('border-amber-500', 'bg-amber-900/30');
  }, 1500);
}

function renderOptionsHtml(currentVal, opts) {
  var html = '<option value="">' + window.tr('form.ai_f_pilih') + '</option>';
  var found = false;
  opts.forEach(function (o) {
    var v = Array.isArray(o) ? o[0] : o;
    var l = Array.isArray(o) ? o[1] : o;
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
var ARRAY_SNAPSHOT: Record<string, string> = {};
var DEFERRED_RENDER: Record<string, boolean> = {};

function arraySignature(type) {
  var items = latestCandidateData[type];
  return items ? JSON.stringify(items) : '';
}

function openSelectIn(container: HTMLElement | null) {
  if (!container) return false;
  var sels = container.querySelectorAll('select.input-micro');
  for (var i = 0; i < sels.length; i++) {
    // Kriteria dropdown terbuka: sedang fokus ATAU pengguna sedang menekan
    // (pointer/mouse belum dilepas). :open tidak bisa dibaca lintas browser,
    // fokus + pointerdown adalah proksi paling andal.
    var el = sels[i] as HTMLSelectElement;
    if (document.activeElement === el || (el as any).dataset.pointerHeld === '1') return true;
  }
  return false;
}

// Kartu sedang berinteraksi: ada select terbuka ATAU input/textarea fokus.
function cardBusy(card: HTMLElement) {
  if (openSelectIn(card)) return true;
  var ae = document.activeElement;
  if (ae && card.contains(ae)) {
    var tag = (ae as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  }
  return false;
}

function flushDeferredArrayRender() {
  for (var type in DEFERRED_RENDER) {
    if (!DEFERRED_RENDER[type]) continue;
    DEFERRED_RENDER[type] = false;
    renderEditableArray(type);
  }
}

export function renderEditableArray(type, containerId?) {
  void containerId; // kompatibel pemanggil lama (container di-resolve sendiri)
  var container = $('c_' + type);
  if (!container) return;
  // (1) Data tidak berubah → JANGAN sentuh DOM (dropdown tidak terganggu).
  var sig = arraySignature(type);
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
  var container = $('c_' + type);
  if (!container) return;
  var items = Array.isArray(latestCandidateData[type]) ? latestCandidateData[type] : [];
  var card = container.querySelector('[data-idx="' + index + '"]');
  if (!card || !items[index]) return;
  var fields = arrayFields[type];
  var inputs = fields
    .map(function (definition) {
      return renderItemField(type, index, items[index], definition);
    })
    .join('');
  var grid = card.querySelector('.grid');
  if (grid) grid.innerHTML = inputs;
  ARRAY_SNAPSHOT[type] = arraySignature(type);
}

function renderItemField(type, index, item, definition) {
  var field = definition[0],
    label = window.tr(definition[1]),
    ctrl = definition[2],
    opts = definition[3];
  var cellOpen = '<div><label class="label-micro">' + label + '</label>';
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
    var isJpSide = field.indexOf('_jp') !== -1;
    var cur = String(item[field] || '').trim();
    var html =
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
    var found = cur === '';
    for (var i = 0; i < opts.length; i++) {
      var val = isJpSide ? opts[i][1] : opts[i][0];
      var lbl = isJpSide ? opts[i][1] + '（' + opts[i][0] + '）' : opts[i][0] + '（' + opts[i][1] + '）';
      var sel = cur === String(val) ? ' selected' : '';
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
  var items = Array.isArray(latestCandidateData[type]) ? latestCandidateData[type] : [];
  var fields = arrayFields[type];
  var cards = items
    .map(function (item, index) {
      var inputs = fields
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
  var changed = false;
  Object.keys(ARRAY_PAIRS).forEach(function (k) {
    var parts = k.split('.');
    var type = parts[0];
    var field = parts[1];
    var pr = ARRAY_PAIRS[k];
    var items = latestCandidateData[type];
    if (!Array.isArray(items)) return;
    items.forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      var src = String(it[field] || '').trim();
      if (!src) return;
      var dst = String(it[pr.partner] || '').trim();
      if (dst) return; // pasangan sudah terisi — jangan timpa
      var val = pr.dir === 'id' ? pairJpOf(pr.pairs, src) : pairIdOf(pr.pairs, src);
      if (val) {
        it[pr.partner] = val;
        changed = true;
      }
    });
  });
  Object.keys(PAIRED_PARTNER).forEach(function (path) {
    var partner = PAIRED_PARTNER[path];
    var pairs = PAIRED_PARS[path];
    if (!pairs) return;
    var idVal = String(getByPath(latestCandidateData, path) || '').trim();
    var jpCur = String(getByPath(latestCandidateData, partner) || '').trim();
    if (idVal && !jpCur) {
      var jp = pairJpOf(pairs, idVal);
      if (jp) {
        setByPath(latestCandidateData, partner, jp);
        changed = true;
      }
    } else if (!idVal && jpCur) {
      var id = pairIdOf(pairs, jpCur);
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
    var pairSel = STATIC_PAIR_SELECTS[id];
    if (pairSel) {
      // Field sudah jadi select pasangan — refresh opsinya dari data, bukan
      // setValue (yang menulis .value pada input readonly yang sudah diganti).
      (pairSel.sel as any).refreshPairs();
      return;
    }
    setValue(id, getByPath(latestCandidateData, fieldPaths[id]));
  });
  renderEditableArray('pendidikan', 'c_pendidikan');
  renderEditableArray('pekerjaan', 'c_pekerjaan');
  renderEditableArray('keluarga', 'c_keluarga');

  // --- MUNCULKAN FOTO LAMA DARI DATABASE ---
  var photoUrl = latestCandidateData.pas_photo || getByPath(latestCandidateData, 'uploads.photo');
  var imgPreview = $('previewFoto');

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
    var key = pair[0] as string,
      statusId = pair[1] as string,
      sudahPilihBaru = pair[2] as boolean;
    var url = getByPath(latestCandidateData, 'uploads.' + key);
    var statusEl = $(statusId);
    if (!statusEl || sudahPilihBaru) return;
    if (url && url !== '-') {
      var namaFile = escapeHtml((url.split('/').pop() || key.toUpperCase()).replace(/_+/g, ' '));
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

export function compressImage(event) {
  var file = event.target.files[0];
  if (!file) return;
  // Guard seragam: format (image/*) + ukuran maks 10 MB — pesan jelas + reset.
  if (!window.cekUploadFile(event.target, { maxMb: 10 })) return;
  var status = $('compressStatus'),
    preview = $('previewFoto');
  status.classList.remove('hidden');
  status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + window.tr('form.ai_f_proses');
  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function (e) {
    var img = new Image();
    // @ts-expect-error JS→TS migration
    img.src = e.target.result;
    img.onload = function () {
      var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');
      var w = img.width,
        h = img.height,
        MAX = 600;
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
      var dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      preview.src = dataUrl;
      preview.classList.remove('hidden');
      status.innerHTML = '<i class="fas fa-check-circle"></i> ' + window.tr('form.ai_f_berhasil');
      currentPhotoBase64 = dataUrl.split(',')[1];
      saveToLocal();
    };
  };
}

export function handleDocUpload(event, type) {
  var file = event.target.files[0];
  if (!file) return;
  // Guard seragam: format sesuai accept + ukuran maks 3 MB — pesan jelas + reset.
  if (!window.cekUploadFile(event.target, { maxMb: 3 })) return;
  var statusEl = $('status_' + type);
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
  var toUpload = Object.keys(filesObj).filter(function (k) {
    return filesObj[k] && filesObj[k].data;
  });
  if (toUpload.length === 0) return {};

  // Upload LANGSUNG ke Cloudinary: base64 hasil downscaleScanImage diubah
  // kembali jadi File, lalu dikirim ke Cloudinary. Backend hanya menerima
  // string URL hasil upload (tidak ada lagi getUploadUrls / Supabase).
  var uploadPromises = toUpload.map(function(key) {
    var file = filesObj[key];
    var blob = base64ToBlob(file.data, file.mime);
    var f = new File([blob], file.name || key + '.jpg', {
      type: file.mime || 'application/octet-stream',
    });
    return uploadToCloudinary(f, {}).then(function(url) { return { key: key, url: url }; });
  });
  var results = await Promise.all(uploadPromises);
  var uploadedUrls: Record<string, any> = {};
  results.forEach(function(r) { uploadedUrls[r.key] = r.url; });
  return uploadedUrls;
}

export async function saveToDatabase() {
  var btn = $('btnSaveDB');
  latestCandidateData =
    latestCandidateData && typeof latestCandidateData === 'object' ? latestCandidateData : {};
  // Jaring penyaman: kalau state nama kosong padahal siswa sudah mengetiknya
  // di field form (mis. autofill dari database menimpa state setelah input),
  // pakai nilai yang terlihat di layar — jangan batalkan penyimpanan.
  var namaDom = $('f_nama');
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
    var namaEl = $('f_nama');
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
  // (2026-08-12, rev): JFT/SSW/ijazah/UNIV wajib PDF; KTP/KK boleh foto HP
  // (JPG/PNG — otomatis di-downscale handleDocUpload) ATAU PDF. Pas foto
  // sudah dijamin JPG/PNG oleh compressImage (canvas). Sinkron dengan
  // aturan per-prefix di storage-helper.ts.
  var extCheck = [
    { f: currentJftFile, t: 'doc' },
    { f: currentSswFile, t: 'doc' },
    { f: currentKtpFile, t: 'foto' },
    { f: currentKkFile, t: 'foto' },
    { f: currentIjazahSdFile, t: 'doc' },
    { f: currentIjazahSmpFile, t: 'doc' },
    { f: currentIjazahSmaFile, t: 'doc' },
    { f: currentUnivFile, t: 'doc' },
  ].filter(function (x) {
    return !!x.f;
  });
  for (var ei = 0; ei < extCheck.length; ei++) {
    var nm = String(extCheck[ei].f.name || '')
      .split('.')
      .pop()
      .toLowerCase();
    var ok = extCheck[ei].t === 'foto' ? ['pdf', 'jpg', 'jpeg', 'png'] : ['pdf'];
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
    var folderName =
      'master/' +
      latestCandidateData.identitas.nama_lengkap.toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
    var filesToUpload = {
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
    var uploadedUrls = await uploadFilesDirectlyBase64(filesToUpload, folderName);

    var payload = {
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
      var res = await withRetry(function() { return window.callAPI('submitDataAsj', payload); }, 2, 2000);
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
  initApp,
  switchTab,
  handleEnter,
  sendMessage,
  updateFormUI,
  compressImage,
  handleDocUpload,
  saveToDatabase,
  updateArrayField,
  removeArrayItem,
  addArrayItem,
});

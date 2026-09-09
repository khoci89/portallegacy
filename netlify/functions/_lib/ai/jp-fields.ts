// jp-fields.ts — SATU-satunya registry pasangan field bilingual (ID → JP).
//
// Sebelumnya vocab ini hidup dua kali dengan bentuk berbeda:
//   - chat.ts          → AI_ID_JP_PAIRS (path nested: ['wawancara','kelebihan_id'])
//   - actions-master.ts → JP_TRANSLATE_MAP (form key: 'kelebihan' → kolom 'kelebihan_jp')
// Dua daftar yang sama-sama sah tapi dirawat terpisah = drift (mis. satu sisi
// dapat field baru, sisi lain tidak). Sekarang SATU daftar; kedua konsumen
// menurunkan bentuknya sendiri dari registry ini.
//
// Setiap entri menyimpan dua proyeksi sekaligus:
//   - idPath/jpPath : path nested di buildMasterNested / AIDATAJSON (chat.ts)
//   - formKey/jpCol : key payload form master → kolom DB versi JP (actions-master.ts)
// Entri yang hanya punya proyeksi nested (kenalan, alias path) sengaja TIDAK
// punya formKey/jpCol — konsumen flat melewatinya secara alami.

export interface JpFieldPair {
  idPath: string[];
  jpPath: string[];
  formKey?: string;
  jpCol?: string;
}

export const JP_FIELD_PAIRS: JpFieldPair[] = [
  // medis
  { idPath: ['medis', 'alergi_id'], jpPath: ['medis', 'alergi_jp'], formKey: 'alergi', jpCol: 'alergi_jp' },
  { idPath: ['medis', 'riwayat_medis_id'], jpPath: ['medis', 'riwayat_medis_jp'], formKey: 'penyakit', jpCol: 'riwayat_medis_jp' },
  { idPath: ['medis', 'riwayat_kecelakaan_id'], jpPath: ['medis', 'riwayat_kecelakaan_jp'], formKey: 'laka', jpCol: 'riwayat_kecelakaan_jp' },
  // wawancara — keys must match buildMasterNested output exactly
  { idPath: ['wawancara', 'promosi_id'], jpPath: ['wawancara', 'promosi_jp'], formKey: 'promosi', jpCol: 'promosi_diri_jp' },
  { idPath: ['wawancara', 'kelebihan_id'], jpPath: ['wawancara', 'kelebihan_jp'], formKey: 'kelebihan', jpCol: 'kelebihan_jp' },
  { idPath: ['wawancara', 'kekurangan_id'], jpPath: ['wawancara', 'kekurangan_jp'], formKey: 'kekurangan', jpCol: 'kekurangan_jp' },
  { idPath: ['wawancara', 'hobi_id'], jpPath: ['wawancara', 'hobi_jp'], formKey: 'hobi', jpCol: 'hobi_jp' },
  { idPath: ['wawancara', 'keahlian_id'], jpPath: ['wawancara', 'keahlian_jp'], formKey: 'keahlianKhusus', jpCol: 'keahlian_khusus_jp' },
  { idPath: ['wawancara', 'motivasi_id'], jpPath: ['wawancara', 'motivasi_jp'] },

  { idPath: ['wawancara', 'motivasi_ke_jepang'], jpPath: ['wawancara', 'motivasi_ke_jepang_jp'], formKey: 'motivasiJepang', jpCol: 'motivasi_ke_jepang_jp' },
  { idPath: ['wawancara', 'alasan_bidang_id'], jpPath: ['wawancara', 'alasan_bidang_jp'] },

  {
    idPath: ['wawancara', 'alasan_memilih_bidang'],
    jpPath: ['wawancara', 'alasan_memilih_bidang_jp'],
    formKey: 'alasanBidang',
    jpCol: 'alasan_memilih_bidang_jp',
  },
  { idPath: ['wawancara', 'rencana_pulang_id'], jpPath: ['wawancara', 'rencana_pulang_jp'] },

  {
    idPath: ['wawancara', 'rencana_setelah_pulang'],
    jpPath: ['wawancara', 'rencana_setelah_pulang_jp'],
    formKey: 'rencanaPulang',
    jpCol: 'rencana_setelah_pulang_jp',
  },
  { idPath: ['wawancara', 'keinginan_id'], jpPath: ['wawancara', 'keinginan_jp'], formKey: 'keinginan', jpCol: 'keinginan_pribadi_jp' },
  { idPath: ['wawancara', 'tujuan_ke_jepang'], jpPath: ['wawancara', 'tujuan_ke_jepang_jp'], formKey: 'tujuanJepang', jpCol: 'tujuan_ke_jepang_jp' },
  // identitas
  { idPath: ['identitas', 'tempat_lahir'], jpPath: ['identitas', 'tempat_lahir_jp'], formKey: 'tempatLahir', jpCol: 'tempat_lahir_jp' },
  { idPath: ['identitas', 'agama'], jpPath: ['identitas', 'agama_jp'], formKey: 'agama', jpCol: 'agama_jp' },
  { idPath: ['identitas', 'status_nikah'], jpPath: ['identitas', 'status_nikah_jp'] },
  { idPath: ['identitas', 'alamat'], jpPath: ['identitas', 'alamat_jp'], formKey: 'alamat', jpCol: 'alamat_jp' },
  // kenalan_jepang — hanya proyeksi nested (kolom JP tidak ada di tabel master;
  // nilainya hidup di ai_data_json, jadi tidak pernah masuk JP_TRANSLATE_MAP)
  { idPath: ['kenalan_jepang', 'nama_id'], jpPath: ['kenalan_jepang', 'nama_jp'] },
  { idPath: ['kenalan_jepang', 'hubungan_id'], jpPath: ['kenalan_jepang', 'hubungan_jp'] },
  { idPath: ['kenalan_jepang', 'pekerjaan_id'], jpPath: ['kenalan_jepang', 'pekerjaan_jp'] },
  { idPath: ['kenalan_jepang', 'alamat_id'], jpPath: ['kenalan_jepang', 'alamat_jp'] },
];

// Pasangan field ID/JP untuk baris array (pendidikan/pekerjaan/keluarga).
// Dipakai autoTranslateMissingJp DAN coverage di handleProcessAIChat.
export const ARRAY_FIELD_PAIRS: Array<{ type: string; idKey: string; jpKey: string }> = [
  { type: 'pendidikan', idKey: 'sekolah', jpKey: 'sekolah_jp' },
  { type: 'pendidikan', idKey: 'jurusan_id', jpKey: 'jurusan_jp' },
  { type: 'pekerjaan', idKey: 'perusahaan', jpKey: 'perusahaan_jp' },
  { type: 'pekerjaan', idKey: 'jabatan', jpKey: 'jabatan_jp' },
  { type: 'keluarga', idKey: 'hubungan_id', jpKey: 'hubungan_jp' },
  { type: 'keluarga', idKey: 'pekerjaan', jpKey: 'pekerjaan_jp' },
];
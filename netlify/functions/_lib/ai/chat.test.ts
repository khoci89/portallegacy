// ==========================================
// TESTS: ai/chat — normalizeBidang (pemilihan model wawancara per bidang SSW).
// Resolve bidang dari teks bebas (master/kandidat) ke BIDANG_INTERVIEW —
// salah map = kandidat dapat model wawancara bidang yang salah.
// ==========================================
import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeBidang } from './chat';
import { handleProcessAIChat } from './chat';
import { geminiGenerate } from './providers';
import { vi } from 'vitest';
// Mock hanya model AI (geminiGenerate) — sisanya (parseJsonLoose,
// translateItemsToJapanese) tetap ASLI supaya tes menguji alur nyata.
vi.mock('./providers', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, geminiGenerate: vi.fn() };
});

describe('normalizeBidang — pilih model wawancara per bidang SSW', () => {
  it('7 bidang resmi dikenali (case-insensitive)', () => {
    expect(normalizeBidang('Kaigo').label).toBe('Kaigo (介護)');
    expect(normalizeBidang('KAIGO').label).toBe('Kaigo (介護)');
    expect(normalizeBidang('Shokuhin Seizou').label).toBe('Shokuhin Seizou (食品製造)');
    expect(normalizeBidang('Nougyou').label).toBe('Nougyou (農業)');
    expect(normalizeBidang('Kensetsu').label).toBe('Kensetsu (建設)');
    expect(normalizeBidang('Jidousha Seibi').label).toBe('Jidousha Seibi (自動車整備)');
    expect(normalizeBidang('Binbou').label).toBe('Binbou (ビルクリーニング)');
    expect(normalizeBidang('Sougou Service').label).toBe('Sougou Service (総合サービス)');
  });

  it('sinonim bahasa Indonesia/Inggris ikut terdeteksi', () => {
    expect(normalizeBidang('perawat lansia').label).toBe('Kaigo (介護)');
    expect(normalizeBidang('caregiver').label).toBe('Kaigo (介護)');
    expect(normalizeBidang('food manufacturing').label).toBe('Shokuhin Seizou (食品製造)');
    expect(normalizeBidang('pertanian').label).toBe('Nougyou (農業)');
    expect(normalizeBidang('konstruksi').label).toBe('Kensetsu (建設)');
    expect(normalizeBidang('otomotif').label).toBe('Jidousha Seibi (自動車整備)');
    expect(normalizeBidang('cleaning').label).toBe('Binbou (ビルクリーニング)');
    expect(normalizeBidang('hotel').label).toBe('Sougou Service (総合サービス)');
  });

  it('bidang tidak dikenal → null (caller pakai BIDANG_DEFAULT)', () => {
    expect(normalizeBidang('IT Programmer')).toBe(null);
    expect(normalizeBidang('')).toBe(null);
    expect(normalizeBidang(undefined)).toBe(null);
  });
});

describe('handleProcessAIChat — auto-translate mengisi field JP apa pun format balasan model', () => {
  it('ID teks tidak boleh berubah saat model memparafrase/memendek _id — hanya _jp yang boleh berubah', async () => {
    // Model berhasil memparafrase + memendek _id (kelebihan_id, alasan_bidang_id)
    // tapi juga mengisi _jp baru. Tanpa guard, merge akan timpa teks ID asli.
    const originalKelebihan = 'Cepat beradaptasi, jujur, dan pandai mengingat sesuatu.';
    const paraphrasedKelebihan = 'Disiplin, jujur, dan cepat hafal.';
    const originalAlasan =
      'Ingin mengembangkan diri dan mengaplikasikan kemampuan kerja keras di bidang tersebut.';
    const shortenedAlasan = 'Ingin berkembang di bidang itu.';
    const modelData = {
      wawancara: {
        kelebihan_id: paraphrasedKelebihan, // beda dari original → harus dikembalikan
        kelebihan_jp: 'モデルが入れた仮の訳。', // model isi → TETAP ditimpa batch
        alasan_bidang_id: shortenedAlasan, // pendek → harus dikembalikan
        alasan_bidang_jp: 'モデルが入れた仮の訳2。',
        motivasi_id: originalKelebihan, // == original → tidak disentuh
        motivasi_jp: '', // kosong → batch isi (ini path di-include karena kosong)
      },
    };
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({
        reply: JSON.stringify({
          reply: 'Selesai, Kak! Beberapa kolom sudah diterjemahkan.',
          data: modelData,
        }),
      })
      // Urutan item batch = urutan JP_FIELD_PAIRS: kelebihan → motivasi → alasan_bidang.
      .mockResolvedValueOnce({
        reply:
          '1. 規律正しく、正直で、物覚えが良いです。\n2. 日本で真面目に働き、貯金しながらスキルアップを目指します。\n3. 自己成長を図り、その分野で努力する能力を活かしたいです。',
      });

    const currentData: any = {
      identitas: { nama_lengkap: 'RINGGA NUR WIRAATMAJA' },
      wawancara: {
        kelebihan_id: originalKelebihan,
        kelebihan_jp: '',
        alasan_bidang_id: originalAlasan,
        alasan_bidang_jp: '',
        motivasi_id: originalKelebihan,
        motivasi_jp: '',
      },
    };

    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );

    // balasan model tetap diteruskan apa adanya (verbatim, tanpa ditulis ulang)
    expect(String(res.reply)).toContain('sudah diterjemahkan');
    // _jp: batch SELALU menang — nilai _jp dari model (yang cuma ditebak di
    // giliran chat) ditimpa terjemahan sebenarnya dari _id.
    expect(res.data.wawancara.kelebihan_jp).toBe('規律正しく、正直で、物覚えが良いです。');
    expect(res.data.wawancara.motivasi_jp).toBe(
      '日本で真面目に働き、貯金しながらスキルアップを目指します。',
    );
    expect(res.data.wawancara.alasan_bidang_jp).toBe(
      '自己成長を図り、その分野で努力する能力を活かしたいです。',
    );
    // TECHNICAL CAUSE OF LEAK: model memparafrase/memendek _id → guard restore
    // byte-for-byte dari currentData (bukan membiarkan overwrite).
    expect(res.data.wawancara.kelebihan_id).toBe(originalKelebihan);
    expect(res.data.wawancara.alasan_bidang_id).toBe(originalAlasan);
    // _id yang sama persis dengan original tidak disentuh (still byte-identical)
    expect(res.data.wawancara.motivasi_id).toBe(originalKelebihan);
  });

  it('guard juga menjaga _id saat model mengirim balasan JSON yang kosong (tidak mengubah apa pun tentang ID)', async () => {
    // Model kirim data {} (tak ada _id yang berubah) tapi _jp kosong → batch
    // mengisi _jp, dan tidak ada _id yang boleh berubah.
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({
        reply: JSON.stringify({ reply: 'Selesai, Kak!', data: {} }),
      })
      .mockResolvedValueOnce({
        reply:
          '1. 私は規律正しく正直です。\n2. 自己成長を図り、その分野で努力する能力を活かしたいです。',
      });

    const currentData: any = {
      identitas: { nama_lengkap: 'RINGGA NUR WIRAATMAJA' },
      wawancara: {
        kelebihan_id: 'Cepat beradaptasi, jujur, dan pandai mengingat sesuatu.',
        kelebihan_jp: '',
        alasan_bidang_id:
          'Ingin mengembangkan diri dan mengaplikasikan kemampuan kerja keras di bidang tersebut.',
        alasan_bidang_jp: '',
      },
    };

    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );

    expect(res.data.wawancara.kelebihan_jp).toBe('私は規律正しく正直です。');
    expect(res.data.wawancara.alasan_bidang_jp).toBe(
      '自己成長を図り、その分野で努力する能力を活かしたいです。',
    );
    expect(res.data.wawancara.kelebihan_id).toBe(currentData.wawancara.kelebihan_id);
    expect(res.data.wawancara.alasan_bidang_id).toBe(currentData.wawancara.alasan_bidang_id);
  });

  beforeEach(() => {
    vi.mocked(geminiGenerate).mockReset();
  });

  it('balasan model PROSA (bukan JSON) tetap mengisi SEMUA field JP yang kosong', async () => {
    // Model menjawab dengan teks biasa seperti yang dulu terjadi ("sedang
    // menerjemahkan...") — bukan objek JSON {reply, data}. Dulu ini membuat
    // handleProcessAIChat langsung return tanpa mengisi field JP sama sekali.
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({
        reply:
          'Siap, Kak RINGGA! Jeklin sedang menerjemahkan bagian Wawancara & Jiko PR ke dalam bahasa Jepang.',
      })
      .mockResolvedValueOnce({
        reply:
          '1. 私は規律正しく正直です。\n2. 自己成長を目指し、その分野で努力する能力を活かしたいです。\n3. 日本で真面目に働き、貯金しながらスキルアップを目指します。',
      });
    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'RINGGA NUR WIRAATMAJA' },
      wawancara: {
        promosi_id: 'Saya adalah pribadi yang disiplin dan jujur.',
        promosi_jp: '',
        alasan_bidang_id: 'Ingin mengembangkan diri di bidang tersebut.',
        alasan_bidang_jp: '',
        keinginan_id: 'Bekerja dengan sungguh-sungguh di Jepang.',
        keinginan_jp: '',
        hobi_id: 'Badminton',
        hobi_jp: 'バドミントン', // sudah terisi → tidak ikut batch
      },
    };
    const res: any = await handleProcessAIChat(
      {
        flow: 'apply', // hindari guard VIP master (butuh sesi)
        history: [{ role: 'user', content: 'tolong terjemahkan semua kolom ke bahasa Jepang' }],
        currentData,
        lang: 'id',
      },
      undefined,
    );
    expect(vi.mocked(geminiGenerate)).toHaveBeenCalledTimes(2); // 1× chat + 1× batch terjemahan
    // Balasan prosa tetap diteruskan apa adanya ke chat...
    expect(String(res.reply)).toContain('sedang menerjemahkan');
    // ...TAPI field JP yang kosong tetap terisi penuh.
    expect(res.data.wawancara.promosi_jp).toBe('私は規律正しく正直です。');
    expect(res.data.wawancara.alasan_bidang_jp).toBe(
      '自己成長を目指し、その分野で努力する能力を活かしたいです。',
    );
    expect(res.data.wawancara.keinginan_jp).toBe(
      '日本で真面目に働き、貯金しながらスキルアップを目指します。',
    );
    // Prosa → server mengirim HANYA kolom JP hasil terjemahan; teks _id
    // tidak ikut dikirim ulang (tidak bisa diparafrase/dipersingkat) dan
    // field yang sudah lengkap tidak disentuh.
    expect(res.data.wawancara.promosi_id).toBeUndefined();
    expect(res.data.wawancara.hobi_id).toBeUndefined();
    expect(res.data.wawancara.hobi_jp).toBeUndefined();
  });

  it('balasan model JSON: _jp yang model isi ditimpa hasil batch (batch menang), yang model lupa tetap diisi', async () => {
    const modelData = {
      wawancara: {
        promosi_id: 'Saya adalah pribadi yang disiplin dan jujur.',
        promosi_jp: 'モデル翻訳の例文です。', // model isi → TETAP ditimpa batch
        keinginan_id: 'Bekerja dengan sungguh-sungguh di Jepang.',
        keinginan_jp: '', // model lupa → batch yang mengisi
      },
    };
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({
        reply: JSON.stringify({
          reply: 'Selesai, Kak! Semua sudah diterjemahkan.',
          data: modelData,
        }),
      })
      // Urutan item batch = urutan JP_FIELD_PAIRS: promosi → keinginan.
      .mockResolvedValueOnce({
        reply:
          '1. 私は規律正しく正直です。\n2. 日本で真面目に働き、貯金しながらスキルアップを目指します。',
      });
    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'RINGGA NUR WIRAATMAJA' },
      wawancara: {
        promosi_id: 'Saya adalah pribadi yang disiplin dan jujur.',
        promosi_jp: '',
        keinginan_id: 'Bekerja dengan sungguh-sungguh di Jepang.',
        keinginan_jp: '',
      },
    };
    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );
    expect(res.reply).toBe('Selesai, Kak! Semua sudah diterjemahkan.');
    // _jp dari model ditimpa terjemahan batch dari _id (batch selalu menang —
    // nilai model di giliran chat cuma tebakan yang bisa salah kolom):
    expect(res.data.wawancara.promosi_jp).toBe('私は規律正しく正直です。');
    // _jp yang model lupa → diisi batch terjemahan:
    expect(res.data.wawancara.keinginan_jp).toBe(
      '日本で真面目に働き、貯金しながらスキルアップを目指します。',
    );
  });

  it('guard juga menjaga _id di array (keluarga.hubungan_id) saat model memparafrase', async () => {
    const originalHubungan = 'Ibu kandung';
    const paraphrasedHubungan = 'Orang tua';
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({
        reply: JSON.stringify({
          reply: 'Selesai, Kak!',
          data: {
            keluarga: [{ hubungan_id: paraphrasedHubungan, hubungan_jp: '母' }],
          },
        }),
      })
      .mockResolvedValueOnce({ reply: '1. 母' });

    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'TEST' },
      keluarga: [{ hubungan_id: originalHubungan, hubungan_jp: '' }],
    };
    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );
    // _id harus dikembalikan ke original (bukan paraphrased)
    expect(res.data.keluarga[0].hubungan_id).toBe(originalHubungan);
    // _jp tetap terisi
    expect(res.data.keluarga[0].hubungan_jp).toBe('母');
  });

  it('kolom ARRAY: model kirim _id KOSONG → tetap dipulihkan, bukan terhapus', async () => {
    // Bug 2026-09-12: guard array dulu bersyarat `inAi && inAi !== origId`,
    // sehingga _id yang dikembalikan model sebagai "" TIDAK dipulihkan →
    // sekolah_id / perusahaan_id hilang dari balasan (dan kolom JP-nya tidak
    // pernah bisa diterjemahkan karena _id-nya kosong).
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({
        reply: JSON.stringify({
          reply: 'Selesai, Kak!',
          data: {
            pendidikan: [
              {
                tingkat: 'SMA/SMK',
                sekolah_id: '', // model mengosongkan → WAJIB dipulihkan
                sekolah_jp: '',
                jurusan_id: 'Teknik Mesin', // sama persis → tidak disentuh
                jurusan_jp: '',
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({ reply: '1. ポノロゴ第1高校\n2. 機械工学' });

    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'TEST' },
      pendidikan: [
        { tingkat: 'SMA/SMK', sekolah_id: 'SMK Negeri 1 Ponorogo', jurusan_id: 'Teknik Mesin' },
      ],
    };
    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );
    expect(Array.isArray(res.data.pendidikan)).toBe(true);
    expect(res.data.pendidikan[0].sekolah_id).toBe('SMK Negeri 1 Ponorogo');
    expect(res.data.pendidikan[0].jurusan_id).toBe('Teknik Mesin');
    expect(res.data.pendidikan[0].sekolah_jp).toBe('ポノロゴ第1高校');
    expect(res.data.pendidikan[0].jurusan_jp).toBe('機械工学');
  });

  it('_jp model yang SALAH TEMPAT ditimpa hasil batch (batch selalu menang)', async () => {
    // Bug 2026-09-12: nilai _jp dari model dulu dianggap final ("model-wins"),
    // jadi kalau model menaruh terjemahan kolom LAIN di kolom yang salah
    // (mis. motivasi_jp diisi teks tujuan_ke_jepang), kolom itu terisi tapi
    // salah isi dan batch tidak pernah memperbaikinya.
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({
        reply: JSON.stringify({
          reply: 'Selesai',
          data: {
            wawancara: {
              motivasi_id: 'Membantu ekonomi keluarga',
              motivasi_jp: '仕事の経験を積みたいです', // salah: isi tujuan
              tujuan_ke_jepang: 'Mencari pengalaman kerja',
              tujuan_ke_jepang_jp: '',
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        reply: '1. 家族の経済を助けるためです。\n2. 仕事の経験を積むためです。',
      });

    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'TEST' },
      wawancara: {
        motivasi_id: 'Membantu ekonomi keluarga',
        motivasi_jp: '',
        tujuan_ke_jepang: 'Mencari pengalaman kerja',
        tujuan_ke_jepang_jp: '',
      },
    };
    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );
    expect(res.data.wawancara.motivasi_jp).toBe('家族の経済を助けるためです。');
    expect(res.data.wawancara.tujuan_ke_jepang_jp).toBe('仕事の経験を積むためです。');
  });

  it('field _id yang masih KOSONG menerima nilai baru dari model (auto-fill chat)', async () => {
    // Bug 2026-09-12: guard `inAi !== origId` juga mengosongkan field yang
    // originalnya kosong → AI TIDAK PERNAH bisa mengisi 24 field registry
    // (hobi/kelebihan/…) yang belum ada isinya, padahal itu inti fitur.
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({
        reply: JSON.stringify({
          reply: 'Siap, hobi dicatat.',
          data: { wawancara: { hobi_id: 'Sepak bola', hobi_jp: '' } },
        }),
      })
      .mockResolvedValueOnce({ reply: '1. サッカーをすること' });

    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'TEST' },
      wawancara: { hobi_id: '', hobi_jp: '' },
    };
    const res: any = await handleProcessAIChat(
      {
        flow: 'apply',
        history: [{ role: 'user', content: 'hobi saya sepak bola' }],
        currentData,
        lang: 'id',
      },
      undefined,
    );
    expect(res.data.wawancara.hobi_id).toBe('Sepak bola');
    expect(res.data.wawancara.hobi_jp).toBe('サッカーをすること');
  });

  it('riwayat_jepang nilai dropdown → kanji EKSAK dari registry, tanpa panggilan Gemini', async () => {
    vi.mocked(geminiGenerate).mockResolvedValueOnce({ reply: 'Baik, Kak.' });
    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'TEST' },
      wawancara: { riwayat_jepang: 'BELUM PERNAH', riwayat_jepang_jp: '' },
    };
    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );
    expect(res.data.wawancara.riwayat_jepang_jp).toBe('未経験');
    // Tanpa batch: nilai dropdown tidak perlu diterjemahkan Gemini.
    expect(vi.mocked(geminiGenerate)).toHaveBeenCalledTimes(1);
  });

  it('riwayat_jepang teks BEBAS (di luar dropdown) → diterjemahkan Gemini', async () => {
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({ reply: 'Baik, Kak.' })
      .mockResolvedValueOnce({ reply: '1. 長野で3年間実習しました。' });
    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'TEST' },
      wawancara: {
        riwayat_jepang: 'Pernah ikut program magang 3 tahun di Nagano',
        riwayat_jepang_jp: '',
      },
    };
    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );
    expect(res.data.wawancara.riwayat_jepang_jp).toBe('長野で3年間実習しました。');
  });

  it('balasan PROSA + kolom array → struktur tetap ARRAY (bukan objek {"0": ...})', async () => {
    // Bug 2026-09-12: setNested selalu membuat {} untuk segmen numerik, jadi
    // hasil translate pendidikan/pekerjaan/keluarga jadi {"0": {...}} — frontend
    // membacanya sebagai objek, bukan array → baris riwayat kosong.
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({ reply: 'Siap, Jeklin sedang menerjemahkan kolomnya.' })
      .mockResolvedValueOnce({
        reply: '1. 高校A\n2. 機械工学\n3. 会社B\n4. オペレーター\n5. 父\n6. 農業',
      });

    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'TEST' },
      pendidikan: [{ sekolah_id: 'SMA A', jurusan_id: 'Teknik Mesin' }],
      pekerjaan: [{ perusahaan_id: 'PT B', jabatan_id: 'Operator' }],
      keluarga: [{ hubungan_id: 'AYAH', pekerjaan_id: 'PETANI' }],
    };
    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );
    expect(Array.isArray(res.data.pendidikan)).toBe(true);
    expect(Array.isArray(res.data.pekerjaan)).toBe(true);
    expect(Array.isArray(res.data.keluarga)).toBe(true);
    expect(res.data.pendidikan[0].sekolah_jp).toBe('高校A');
    expect(res.data.pendidikan[0].jurusan_jp).toBe('機械工学');
    expect(res.data.pekerjaan[0].perusahaan_jp).toBe('会社B');
    expect(res.data.pekerjaan[0].jabatan_jp).toBe('オペレーター');
    expect(res.data.keluarga[0].hubungan_jp).toBe('父');
    expect(res.data.keluarga[0].pekerjaan_jp).toBe('農業');
  });

  it('baris array BARU dari model (index belum ada di currentData) → kolom JP-nya ikut diterjemahkan', async () => {
    // Dulu loop batch berhenti di panjang currentData, jadi baris riwayat yang
    // baru ditambah model pulang tanpa kolom JP sama sekali.
    vi.mocked(geminiGenerate)
      .mockResolvedValueOnce({
        reply: JSON.stringify({
          reply: 'Baik, Kak.',
          data: {
            pendidikan: [
              { sekolah_id: 'SMA C', sekolah_jp: '', jurusan_id: 'IPA', jurusan_jp: '' },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({ reply: '1. 高校C\n2. 理科' });
    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'TEST' },
      pendidikan: [],
    };
    const res: any = await handleProcessAIChat(
      { flow: 'apply', history: [], currentData, lang: 'id' },
      undefined,
    );
    expect(Array.isArray(res.data.pendidikan)).toBe(true);
    expect(res.data.pendidikan[0].sekolah_id).toBe('SMA C');
    expect(res.data.pendidikan[0].sekolah_jp).toBe('高校C');
    expect(res.data.pendidikan[0].jurusan_jp).toBe('理科');
  });

  it('kanji eksak hasil snap registry TIDAK ditimpa terjemahan bebas batch', async () => {
    // Snap silsilah jalan SEBELUM batch: hubungan_id "kakak laki2" → KAKAK
    // LAKI-LAKI dan hubungan_jp = 兄 (kanji eksak registry). Batch harus
    // menganggapnya sudah terisi — bukan menerjemahkan ulang jadi kalimat bebas.
    vi.mocked(geminiGenerate).mockResolvedValueOnce({
      reply: JSON.stringify({
        reply: 'Baik, Kak.',
        data: { keluarga: [{ hubungan_id: 'kakak laki2', hubungan_jp: '' }] },
      }),
    });
    const currentData: Record<string, any> = {
      identitas: { nama_lengkap: 'TEST' },
      keluarga: [{ hubungan_id: '', hubungan_jp: '' }],
    };
    const res: any = await handleProcessAIChat(
      {
        flow: 'apply',
        history: [{ role: 'user', content: 'kakak saya laki-laki' }],
        currentData,
        lang: 'id',
      },
      undefined,
    );
    expect(res.data.keluarga[0].hubungan_id).toBe('KAKAK LAKI-LAKI');
    expect(res.data.keluarga[0].hubungan_jp).toBe('兄');
    // Tanpa batch: kanji registry sudah benar, tidak perlu Gemini kedua kali.
    expect(vi.mocked(geminiGenerate)).toHaveBeenCalledTimes(1);
  });
});

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
        kelebihan_jp: '規律正しく、正直で、物覚えが良いです。', // baru, boleh diterima
        alasan_bidang_id: shortenedAlasan, // pendek → harus dikembalikan
        alasan_bidang_jp: '自己成長を図り、その分野で努力する能力を活かしたいです。',
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
      .mockResolvedValueOnce({
        reply:
          '1. 日本で真面目に働き、貯金しながらスキルアップを目指します。\n2. 自己成長を図り、その分野で努力する能力を活かしたいです。',
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
    // _jp hasil batch (atau dari model) tetap terisi
    expect(res.data.wawancara.kelebihan_jp).toBe('規律正しく、正直で、物覚えが良いです。');
    expect(res.data.wawancara.alasan_bidang_jp).toBe(
      '自己成長を図り、その分野で努力する能力を活かしたいです。',
    );
    expect(res.data.wawancara.motivasi_jp).toBe(
      '日本で真面目に働き、貯金しながらスキルアップを目指します。',
    );
    // TECHNICAL CAUSE OF LEAK: model memparafrase/memendek _id → guard restore
    // byte-for-byte dari currentData (bukan membiarkan overwrite).
    expect(res.data.wawancara.kelebihan_id).toBe(originalKelebihan);
    expect(res.data.wawancara.alasan_bidang_id).toBe(originalAlasan);
    // _id yang sama persis dengan original tidak disentuh (still byte-identical)
    expect(res.data.wawancara.motivasi_id).toBe(originalKelebihan);
    // _id yang model tidak kirim sama sekali tidak ikut ke payload (_jp saja)
    expect(res.data.wawancara.motivasi_id).toBe(originalKelebihan);
    // _jp asli yang sudah ada tidak dihapus oleh guard
    expect(res.data.wawancara.kelebihan_jp).toBe('規律正しく、正直で、物覚えが良いです。');
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

  it('balasan model JSON yang lupa mengisi sebagian _jp → batch mengisi yang kurang tanpa menimpa isi model', async () => {
    const modelData = {
      wawancara: {
        promosi_id: 'Saya adalah pribadi yang disiplin dan jujur.',
        promosi_jp: 'モデル翻訳の例文です。', // model sudah isi → harus dipertahankan
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
      // Batch HANYA berisi item yang model belum isi (promosi sudah di-cover
      // model → tidak ikut batch → isi model dipertahankan).
      .mockResolvedValueOnce({
        reply: '1. 日本で真面目に働き、貯金しながらスキルアップを目指します。',
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
    // _jp yang sudah diisi model TIDAK ditimpa hasil batch:
    expect(res.data.wawancara.promosi_jp).toBe('モデル翻訳の例文です。');
    // _jp yang model lupa → diisi batch terjemahan:
    expect(res.data.wawancara.keinginan_jp).toBe(
      '日本で真面目に働き、貯金しながらスキルアップを目指します。',
    );
  });
});

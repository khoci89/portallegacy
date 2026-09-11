import { geminiGenerate, parseJsonLoose } from './providers';
// ai/translate-lines — terjemahan batch ID→JP yang TOLERAN terhadap output model.
//
// Kenapa BUKAN kontrak JSON objek {"0":..,"1":..}? (chat.ts / actions-master.ts,
// 2026-09-06 — bug "terjemahan CV AI tidak full"): Gemini kadang mengembalikan
// JSON dengan satu escape bermasalah (mis. "Bad Unicode escape in JSON at
// position ..."). Satu byte rusak membuat parseJsonLoose melempar → SEMUA hasil
// batch dibuang (7 field JP tetap kosong). Kontrak BARIS-PER-BARIS lebih aman:
// tiap baris independen, teks Jepang ditulis langsung (Kanji/Kana) tanpa JSON
// string escaping, dan baris yang rusak hanya menggugurkan item itu saja.
//
// FIX 2026-09-09: Paragraf multi-baris pada item jiko/PR sebelumnya menyebabkan
// nomor item ter campur — baris kosong memisahkan paragraf tapi parser menganggap
// baris kosong = akhir item. Solusi: (1) ratakan input jadi satu baris per item
// sebelum numbering, (2) tambah delimiter "###" di prompt sebagai fallback utama,
// (3) parser sequential: hanya terima nomor urut berikutnya.

const NL = String.fromCharCode(10);
const DELIM = '###';

// Terjemahkan daftar teks ID → JP. Return array sepanjang `items`; entri kosong
// berarti item belum diterjemahkan (pemanggil mengabaikannya — tidak membatalkan
// item lain).
export async function translateItemsToJapanese(items: string[]): Promise<string[]> {
  const count = items.length;
  const out: string[] = new Array(count).fill('');
  if (count === 0) return out;

  // Ratakan input: ganti newline dengan spasi supaya paragraf tidak merusak
  // penomoran. Model tetap menerima teks panjang dalam satu item.
  const flat = items.map((t) => t.replace(/[\r\n]+/g, ' ').trim());

  // Prompt meminta delimiter "###" antar item — lebih robust daripada nomor
  // baris untuk paragraf panjang. Model boleh pakai newline di dalam item.
  const prompt =
    'Terjemahkan teks berikut ke bahasa Jepang untuk keperluan formulir biodata (CV) kerja.' +
    NL + 'ATURAN:' +
    NL + '- Terjemahkan baris demi baris, dan pertahankan urutannya.' +
    NL + '- JANGAN menambahkan teks lain selain terjemahan.' +
    NL + '- Pisahkan setiap hasil terjemahan dengan baris yang HANYA berisi delimiter "###".' +
    NL + '- Teks mungkin berisi kalimat atau hanya satu kata.' +
    NL + NL +
    'INPUT TEKS UNTUK DITERJEMAHKAN:' + NL +
    flat.join(NL + DELIM + NL);

  let text = '';
  try {
    const r = await geminiGenerate(prompt, []);
    text = String(r && r.reply ? r.reply : '').trim();
  } catch (e) {
    console.error('[translateItems] Gemini error:', e && e.message ? e.message : e);
    return out;
  }
  if (!text) return out;
  console.log('RAW GEMINI RESPONSE:', JSON.stringify(text));

  // Strategi 1: Coba parse dengan delimiter "###".
  if (text.includes(DELIM)) {
    const chunks = text.split(new RegExp('(?:^|\\n)\\s*' + DELIM + '\\s*(?=\\n|$)'));
    const trimmed = chunks
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (trimmed.length === count) {
      for (let i = 0; i < count; i++) {
        // Strip leading "N. " jika model tetap pakai numbering + delimiter.
        const cleaned = trimmed[i].replace(/^\d{1,3}[.)、:：]\s*/, '').trim();
        out[i] = cleaned;
      }
      if (out.some((v) => v)) return out;
    }
    // Delimiter ada tapi jumlah chunk != count → lanjut ke strategi berikutnya.
  }

  // Strategi 2: Nomor baris SEQUENTIAL — hanya terima urutan 1,2,3,...
  // Baris continuation (tanpa nomor) digabung ke item sebelumnya.
  const lineRe = /^(\d{1,3})[.)、:：]\s*(.+)$/;
  let expected = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = String(rawLine).trim();
    if (!line || line === DELIM) continue;
    const m = line.match(lineRe);
    if (m) {
      const idx = Number(m[1]) - 1;
      if (idx === expected && idx < count) {
        expected++;
        out[idx] = m[2].trim();
      } else if (idx >= 0 && idx < count && idx !== expected) {
        // Out-of-order → hentikan parsing sequential (paragraf rusak).
        break;
      }
    } else if (expected > 0 && expected <= count) {
      // Continuation line → gabung ke item sebelumnya.
      const prev = expected - 1;
      out[prev] = (out[prev] ? out[prev] + ' ' : '') + line;
    }
  }
  if (out.some((v) => v)) return out;

  // Strategi 3: Model tetap balas JSON (kontrak lama) → coba salvage.
  try {
    const parsed = parseJsonLoose(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (let i = 0; i < count; i++) {
        const v = String(parsed[String(i)] || '').trim();
        if (v) out[i] = v;
      }
    }
  } catch (e) {
    /* biarkan kosong — item yang gagal tidak menggagalkan yang lain */
  }
  return out;
}

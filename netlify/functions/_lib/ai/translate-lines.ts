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

const NL = String.fromCharCode(10);

// Terjemahkan daftar teks ID → JP. Return array sepanjang `items`; entri kosong
// berarti item belum diterjemahkan (pemanggil mengabaikannya — tidak membatalkan
// item lain).
export async function translateItemsToJapanese(items: string[]): Promise<string[]> {
  const count = items.length;
  const out: string[] = new Array(count).fill('');
  if (count === 0) return out;

  const numbered = items.map((t, i) => i + 1 + '. ' + t).join(NL);
  const prompt =
    'Terjemahkan Bahasa Indonesia ke Bahasa Jepang untuk CV kerja.' +
    NL +
    'Tulis hasilnya PER BARIS — satu baris satu terjemahan. JANGAN pakai JSON, ' +
    'JANGAN pakai escape backslash-u, JANGAN beri tanda kutip di luar teks. ' +
    'Format tiap baris: nomor item, titik, lalu teks Jepang (tulis langsung huruf Kanji/Kana).' +
    NL +
    'Contoh:' +
    NL +
    '1. 私はインドネシア人です' +
    NL +
    NL +
    numbered;

  let text = '';
  try {
    const r = await geminiGenerate(prompt, []);
    text = String(r && r.reply ? r.reply : '').trim();
  } catch (e) {
    console.error('[translateItems] Gemini error:', e && e.message ? e.message : e);
    return out;
  }
  if (!text) return out;

  // Parse toleran: baris bernomor diambil; baris lanjutan (paragraf panjang yang
  // kebawa ke baris berikutnya) digabung ke item sebelumnya.
  const lineRe = /^(\d{1,3})[.)、:：]\s*(.+)$/;
  let cur = -1;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = String(rawLine).trim();
    if (!line) continue;
    const m = line.match(lineRe);
    if (m) {
      const idx = Number(m[1]) - 1;
      cur = idx >= 0 && idx < count ? idx : -1;
      if (cur >= 0) out[cur] = m[2].trim();
    } else if (cur >= 0) {
      out[cur] = (out[cur] ? out[cur] + ' ' : '') + line;
    }
  }
  if (out.some((v) => v)) return out;

  // Model tetap balas JSON (kontrak lama) → coba salvage supaya tidak sia-sia.
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

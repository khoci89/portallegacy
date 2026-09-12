// ==========================================
// TESTS: ai-chat.sendMessage — sinkronisasi state balik ke modul ai_form.
// ==========================================
// Regresi 2026-09-12: refactor a64ef65 memindahkan sendMessage ke ai-chat.ts,
// dan `deps.latestCandidateData = merge(...)` cuma menulis ke objek deps
// (hasil getChatDeps()) — BUKAN variabel modul ai_form. Akibatnya updateFormUI()
// dan saveToLocal() membaca state lama: form tidak pernah terisi dari balasan
// AI (termasuk kolom _jp hasil terjemahan).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMessage, type ChatDeps } from './ai-chat';

function fakeEl(extra: Record<string, any> = {}) {
  return {
    value: '',
    disabled: false,
    innerHTML: '',
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    focus: () => {},
    insertAdjacentHTML: () => {},
    scrollTop: 0,
    scrollHeight: 0,
    ...extra,
  } as any;
}

function makeDeps(overrides: Partial<ChatDeps> = {}): ChatDeps {
  return {
    $: (id: string) => fakeEl(id === 'userInput' ? { value: 'terjemahkan semua kolom' } : {}),
    chatHistory: [],
    latestCandidateData: { wawancara: { kelebihan_id: 'Disiplin' } },
    currentPhotoBase64: '',
    urlJeklin: '/img/jeklin.png',
    formContext: { flow: 'apply' },
    saveToLocal: () => {},
    mergeCandidateData: () => ({}),
    updateFormUI: () => {},
    setLatestCandidateData: () => {},
    ...overrides,
  };
}

describe('ai-chat.sendMessage — state balik ke modul ai_form', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { getElementById: () => null });
    vi.stubGlobal('window', { CURRENT_LANG: 'id', tr: (k: string) => k, callAPI: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('memanggil setLatestCandidateData(hasil merge) SEBELUM updateFormUI', async () => {
    const order: string[] = [];
    let synced: any = null;
    const merged = { wawancara: { kelebihan_id: 'Disiplin', kelebihan_jp: '規律正しく正直です。' } };

    const deps = makeDeps({
      mergeCandidateData: () => merged,
      setLatestCandidateData: (d) => {
        synced = d;
        order.push('setLatestCandidateData');
      },
      updateFormUI: () => order.push('updateFormUI'),
      saveToLocal: () => order.push('saveToLocal'),
    });
    (globalThis as any).window.callAPI.mockResolvedValue({ reply: 'Selesai', data: merged });

    await sendMessage(deps);

    expect((globalThis as any).window.callAPI).toHaveBeenCalledWith(
      'processAIChat',
      expect.objectContaining({ flow: 'apply' }),
    );
    // Data hasil merge harus ditulis balik ke state modul DULU, baru render.
    // (saveToLocal pertama = simpan pesan user, sebelum balasan datang.)
    expect(order.slice(-3)).toEqual(['setLatestCandidateData', 'updateFormUI', 'saveToLocal']);
    expect(synced).toBe(merged);
    expect(deps.latestCandidateData).toBe(merged);
  });

  it('tidak menyentuh state kalau balasan AI tanpa data', async () => {
    let synced = false;
    const deps = makeDeps({
      setLatestCandidateData: () => {
        synced = true;
      },
      updateFormUI: () => {
        throw new Error('updateFormUI tidak boleh dipanggil tanpa data');
      },
    });
    (globalThis as any).window.callAPI.mockResolvedValue({ reply: 'Halo, ada yang bisa dibantu?' });

    await sendMessage(deps);

    expect(synced).toBe(false);
  });
});

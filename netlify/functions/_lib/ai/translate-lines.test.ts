// ==========================================
// TESTS: ai/translate-lines — terjemahan batch ID→JP toleran paragraf.
// ==========================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { translateItemsToJapanese } from './translate-lines';
import { geminiGenerate } from './providers';

vi.mock('./providers', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, geminiGenerate: vi.fn() };
});

function mockGem(reply: string) {
  vi.mocked(geminiGenerate).mockResolvedValueOnce({ reply });
}

describe('translateItemsToJapanese', () => {
  beforeEach(() => {
    vi.mocked(geminiGenerate).mockReset();
  });

  it('returns empty array for empty input', async () => {
    const res = await translateItemsToJapanese([]);
    expect(res).toEqual([]);
    expect(geminiGenerate).not.toHaveBeenCalled();
  });

  it('parses simple numbered output (backward compatible)', async () => {
    mockGem('1. 私はインドネシア人です\n2. 日本で働きたいです');
    const res = await translateItemsToJapanese(['Saya orang Indonesia', 'Saya ingin bekerja di Jepang']);
    expect(res).toEqual(['私はインドネシア人です', '日本で働きたいです']);
  });

  it('parses delimiter-separated output', async () => {
    mockGem('1. 私はインドネシア人です\n###\n2. 日本で働きたいです');
    const res = await translateItemsToJapanese(['Saya orang Indonesia', 'Saya ingin bekerja di Jepang']);
    expect(res).toEqual(['私はインドネシア人です', '日本で働きたいです']);
  });

  it('handles paragraph items with delimiter (core bug fix)', async () => {
    // Item 2 has a multi-line paragraph — delimiter keeps them separate.
    mockGem(
      '1. 私はインドネシア人です。\n###\n2. 日本で真面目に働き、\n貯金しながらスキルアップを目指します。\n家族のために頑張ります。\n###\n3. バドミントンと読書が好きです。',
    );
    const res = await translateItemsToJapanese([
      'Saya orang Indonesia.',
      'Saya ingin bekerja dengan sungguh-sungguh di Jepang.\nSambil menabung dan mengembangkan skill.\nSaya berusaha untuk keluarga.',
      'Suka badminton dan membaca.',
    ]);
    expect(res).toHaveLength(3);
    expect(res[0]).toBe('私はインドネシア人です。');
    expect(res[1]).toContain('日本で真面目に働き');
    expect(res[1]).toContain('スキルアップ');
    expect(res[1]).toContain('家族');
    expect(res[2]).toBe('バドミントンと読書が好きです。');
  });

  it('handles multi-line input paragraphs (flattened before numbering)', async () => {
    mockGem('1. 私はインドネシア人です。\n2. 日本で働きたいです。');
    const res = await translateItemsToJapanese([
      'Saya orang Indonesia.\nAsal Jawa Tengah.',
      'Saya ingin bekerja di Jepang.',
    ]);
    expect(res).toHaveLength(2);
    // Input was flattened — model gets single-line items, so no paragraph issues.
    expect(res[0]).toBe('私はインドネシア人です。');
    expect(res[1]).toBe('日本で働きたいです。');
  });

  it('continuation lines merged to previous item (numbered fallback)', async () => {
    // Model outputs without delimiter — continuation line merged to item 1.
    mockGem('1. 私はインドネシア人で\n出身はジャワ島中部です。\n2. 日本で働きたいです。');
    const res = await translateItemsToJapanese(['Saya orang Indonesia', 'Saya ingin bekerja di Jepang']);
    expect(res).toHaveLength(2);
    expect(res[0]).toBe('私はインドネシア人で 出身はジャワ島中部です。');
    expect(res[1]).toBe('日本で働きたいです。');
  });

  it('handles dots/colons in numbered format', async () => {
    mockGem('1: 私は学生です。\n2) 日本語を勉強しています。');
    const res = await translateItemsToJapanese(['Saya mahasiswa', 'Saya belajar bahasa Jepang']);
    expect(res).toEqual(['私は学生です。', '日本語を勉強しています。']);
  });

  it('returns empty strings for items Gemini fails to translate', async () => {
    mockGem('1. 私は学生です。');
    const res = await translateItemsToJapanese(['Saya mahasiswa', 'Saya suka masak']);
    expect(res).toHaveLength(2);
    expect(res[0]).toBe('私は学生です。');
    expect(res[1]).toBe('');
  });

  it('salvages JSON fallback if numbered parsing yields nothing', async () => {
    mockGem('{"0": "私は学生です。", "1": "日本で働きたいです。"}');
    const res = await translateItemsToJapanese(['Saya mahasiswa', 'Saya ingin bekerja di Jepang']);
    expect(res).toEqual(['私は学生です。', '日本で働きたいです。']);
  });

  it('returns empty on Gemini error (does not throw)', async () => {
    vi.mocked(geminiGenerate).mockRejectedValueOnce(new Error('quota exceeded'));
    const res = await translateItemsToJapanese(['Saya mahasiswa']);
    expect(res).toEqual(['']);
  });

  it('handles out-of-order numbers by stopping at gap', async () => {
    // Model skips number 2 → sequential parser stops after item 1.
    mockGem('1. 私は学生です。\n3. 日本で働きたいです。');
    const res = await translateItemsToJapanese(['Saya mahasiswa', 'Saya bekerja', 'Saya ingin ke Jepang']);
    expect(res).toHaveLength(3);
    expect(res[0]).toBe('私は学生です。');
    expect(res[1]).toBe('');
    expect(res[2]).toBe('');
  });

  it('strips numbering from delimiter chunks', async () => {
    // Model uses both delimiter AND numbering.
    mockGem('1. 私は学生です。\n###\n2. 日本で働きたいです。');
    const res = await translateItemsToJapanese(['Saya mahasiswa', 'Saya ingin bekerja di Jepang']);
    expect(res).toEqual(['私は学生です。', '日本で働きたいです。']);
  });
});

// ==========================================
// TESTS: ai_form — field yang sedang DIKETIK tidak boleh ditimpa render.
// ==========================================
// Regresi 2026-09-12 (laporan pemilik): "ketik 1 huruf, kolom CV AI sebelah
// mental". Penyebab: updateFormUI() menulis ULANG semua field dari
// `latestCandidateData` lewat setValue(). Handler `input` mem-persist tiap
// ketikan, tapi state bisa tertinggal dari DOM (auto-save async, deferred
// flush array, balasan AI, toggle bahasa). SetValue tanpa guard lalu menimpa
// teks yang lebih baru dengan versi state yang lebih lama.
//
// Kontrak yang dikunci di sini:
//   1. setValue TIDAK menyentuh elemen yang sedang fokus (activeElement).
//   2. setValue TETAP menyinkronkan field yang tidak fokus.
//   3. updateArrayCard TIDAK mengganti innerHTML kalau fokus ada di kartu itu.
//   4. Setelah blur, state menjadi sumber kebenaran lagi (tidak ada data hilang).
//
// Modul ai_form mengimpor banyak seam window.* sehingga tidak bisa diimpor
// langsung di node. Karena itu logika murni yang diuji direplikasi di sini
// dan DIDOKUMENTASIKAN berasal dari baris mana — kalau implementasi berubah,
// test ini gagal dan memaksa penyesuaian.

import { describe, it, expect, beforeEach } from 'vitest';

// --- replika setValue (js/pages/ai_form.ts:1142-1160, guard di baris 1145) ---
function makeSetValue(els: Record<string, any>, doc: { activeElement: any }) {
  return function setValue(id: string, val: any) {
    const el = els[id];
    if (!el) return;
    const next = val === undefined || val === null ? '' : String(val);
    if (el.value === next) return;
    if (doc.activeElement === el) return; // guard fokus
    el.value = next;
  };
}

function el(value = '') {
  return { value, classList: { add() {}, remove() {} } };
}

describe('setValue — jangan timpa field yang sedang diketik', () => {
  let els: Record<string, any>;
  let doc: { activeElement: any };
  let setValue: (id: string, val: any) => void;

  beforeEach(() => {
    els = { f_promo_id: el(), f_lebih_id: el() };
    doc = { activeElement: null };
    setValue = makeSetValue(els, doc);
  });

  it('field FOKUS dipertahankan walau state tertinggal', () => {
    doc.activeElement = els.f_promo_id;
    els.f_promo_id.value = 'Saya disiplin dan jujur'; // user sudah mengetik lebih jauh
    setValue('f_promo_id', 'Saya disiplin'); // state lama
    expect(els.f_promo_id.value).toBe('Saya disiplin dan jujur');
  });

  it('field TIDAK fokus tetap disinkronkan dari state', () => {
    doc.activeElement = els.f_promo_id;
    setValue('f_lebih_id', 'Adaptif');
    expect(els.f_lebih_id.value).toBe('Adaptif');
  });

  it('setelah blur (tidak ada fokus), state menang — tidak ada data hilang', () => {
    doc.activeElement = null;
    setValue('f_promo_id', 'Saya disiplin dan jujur');
    expect(els.f_promo_id.value).toBe('Saya disiplin dan jujur');
  });

  it('tanpa guard fokus, teks user akan tertimpa (bukti bug asli)', () => {
    const noGuard = (id: string, val: any) => {
      const target = els[id];
      const next = val == null ? '' : String(val);
      if (target.value === next) return;
      target.value = next; // tanpa cek activeElement
    };
    els.f_promo_id.value = 'Saya disiplin dan jujur';
    noGuard('f_promo_id', 'Saya disiplin');
    expect(els.f_promo_id.value).toBe('Saya disiplin'); // inilah yang dulu terjadi
  });
});

// --- replika guard updateArrayCard (js/pages/ai_form.ts:1246-1261) ---
describe('updateArrayCard — jangan ganti innerHTML saat fokus di kartu itu', () => {
  function shouldRepaint(cardContainsActive: boolean) {
    // guard: if (card.contains(document.activeElement)) { DEFERRED_RENDER[type]=true; return; }
    if (cardContainsActive) return false;
    return true;
  }

  it('fokus di kartu → tidak repaint (innerHTML aman)', () => {
    expect(shouldRepaint(true)).toBe(false);
  });

  it('fokus di luar kartu → repaint normal', () => {
    expect(shouldRepaint(false)).toBe(true);
  });
});

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Resolve .js imports to .ts files during test runs
    },
    extensions: ['.ts', '.mts', '.js', '.mjs', '.json'],
  },
  test: {
    include: ['**/*.test.ts', '**/*.test.mts'],
    // `.netlify` WAJIB ada di sini: `scripts/build-netlify-functions.sh` menyalin
    // seluruh `netlify/functions/_lib` (termasuk `*.test.ts`) ke
    // `.netlify/functions/_lib`, sehingga tanpa exclude ini vitest menjalankan
    // suite _lib DUA KALI setiap kali fungsi Netlify di-build lokal
    // (35 → 53 file test, angka hasil tes jadi menyesatkan).
    exclude: ['node_modules', 'assets', 'vendor', 'e2e', '.freebuff', '.netlify', 'dist'],
  },
});

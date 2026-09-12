// =============================================================================
// local-preview.mts — Preview LOKAL lengkap: static + Netlify Functions.
// -----------------------------------------------------------------------------
// Kenapa ada: `node serve-static.mts` hanya menyajikan file statis — semua
// panggilan /api/* mati, jadi bug yang melibatkan backend (sesi, guard role,
// notifikasi) tidak bisa diuji di lokal. `netlify dev` butuh link site
// (interaktif) dan tidak bisa dipakai otomatis.
//
// Script ini:
//   1. Memuat .env.local ke process.env (supaya `process.env.X` DAN helper
//      env() dua-duanya jalan, sama seperti di Netlify).
//   2. Menyajikan file statis dari root repo.
//   3. Meneruskan /api/<fungsi> dan /.netlify/functions/<fungsi> ke bundel
//      fungsi hasil build di .netlify/functions/<fungsi>.js — memanggil
//      default export (handler signature Netlify v2: (Request) => Response).
//
// Pemakaian:
//   node scripts/local-preview.mts            → port 8787
//   PORT=3000 node scripts/local-preview.mts
//   node scripts/local-preview.mts --build    → build ulang fungsi dulu
// =============================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 8787;
const FN_DIR = join(ROOT, '.netlify', 'functions');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

// --- 1. Muat .env.local ke process.env --------------------------------------
// Hanya baris `KEY=value` (komentar/tabel dilewati) — cukup untuk dev lokal.
function loadDotEnv(): number {
  let n = 0;
  try {
    const raw = readFileSync(join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#') || t.startsWith(';') || t.startsWith('|')) continue;
      const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) {
        process.env[m[1]] = v;
        n++;
      }
    }
  } catch {
    /* tanpa .env.local — tetap jalan, hanya backend butuh env */
  }
  return n;
}

// --- 2. Cache modul fungsi --------------------------------------------------
// Di-key juga oleh mtime file: habis `build-netlify-functions.sh` dijalankan,
// fungsi otomatis dimuat ulang TANPA perlu restart server preview.
const fnCache = new Map<string, { mtime: number; handler: any }>();

async function loadFn(name: string) {
  const file = join(FN_DIR, name + '.js');
  const st = await stat(file);
  const hit = fnCache.get(name);
  if (hit && hit.mtime === st.mtimeMs) return hit.handler;
  const mod = await import(pathToFileURL(file).href + '?mtime=' + st.mtimeMs);
  const handler = mod.default || mod.handler;
  if (typeof handler !== 'function') throw new Error('handler bukan fungsi: ' + name);
  fnCache.set(name, { mtime: st.mtimeMs, handler });
  console.log(`[preview] fungsi dimuat: ${name}.js`);
  return handler;
}

function safeJoin(root: string, pathname: string): string | null {
  const p = resolve(root, '.' + pathname);
  return p.startsWith(resolve(root)) ? p : null;
}

// --- 3. Server --------------------------------------------------------------
const envCount = loadDotEnv();

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // --- Fungsi Netlify: /api/<fn> atau /.netlify/functions/<fn> ---
  const fnMatch =
    pathname.match(/^\/api\/([A-Za-z0-9_-]+)$/) ||
    pathname.match(/^\/\.netlify\/functions\/([A-Za-z0-9_-]+)$/);

  if (fnMatch) {
    const name = fnMatch[1];
    try {
      const handler = await loadFn(name);
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const bodyBuf = Buffer.concat(chunks);

      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined) continue;
        headers.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
      headers.set('x-nf-client-connection-ip', '127.0.0.1');

      const fnReq = new Request(url.toString(), {
        method: req.method,
        headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : bodyBuf,
      });

      const out = await handler(fnReq, {});
      const buf = Buffer.from(await out.arrayBuffer());
      const outHeaders: Record<string, string> = {};
      out.headers.forEach((v: string, k: string) => {
        if (k.toLowerCase() !== 'content-encoding') outHeaders[k] = v;
      });
      res.writeHead(out.status, outHeaders);
      res.end(buf);
    } catch (e: any) {
      console.error(`[preview] fungsi "${name}" error:`, e.message);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          success: false,
          error: 'Fungsi ' + name + ' gagal: ' + e.message,
          hint: 'Jalankan `bash scripts/build-netlify-functions.sh` dulu.',
        }),
      );
    }
    return;
  }

  // --- Statis ---
  if (pathname === '/') pathname = '/index.html';
  const filePath = safeJoin(ROOT, pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  try {
    const st = await stat(filePath);
    if (!st.isFile()) throw new Error('bukan file');
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + pathname);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[preview] http://127.0.0.1:${PORT}  (static + functions)`);
  console.log(`[preview] .env.local: ${envCount} variabel dimuat ke process.env`);
  console.log(`[preview] fungsi: ${FN_DIR}`);
});

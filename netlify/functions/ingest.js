import { handleProcessUploadDoc  } from './_lib/actions-ingest';
import { verifyToken  } from './_lib/session';
import * as rateLimit from './_lib/rate-limit';

// ingest.js — Standalone wrapper untuk Smart Ingestion.
// HANYA membundel actions-ingest.ts + deps-nya (pdf-parse, xlsx, mammoth).
// Function lain TIDAK perlu membundel library berat ini.
// Dipanggil dari api-client.js: processUploadDoc → 'ingest'

function clientIp(req) {
  if (!req || !req.headers) return null;
  const getHeader = (name) => typeof req.headers.get === 'function' ? req.headers.get(name) : req.headers[name];
  const fwd = getHeader('x-forwarded-for');
  if (fwd) return String(fwd).split(',')[0].trim();
  return getHeader('client-ip') || getHeader('x-real-ip') || null;
}

// FIX (audit 2026-09-07): ingest adalah operasi BERAT (download 15s + panggilan
// Gemini) dan dulu TANPA rate limit sama sekali — sekarang 10 req/menit/IP.
function limited(req) {
  const ip = clientIp(req) || 'unknown';
  const r = rateLimit.check('ingest:' + ip, { limit: 10, windowMs: 60000 });
  return r.ok
    ? null
    : Response.json({
          success: false,
          message: 'Terlalu banyak permintaan. Coba lagi dalam ' + (r.retryAfter || 60) + ' detik.',
        }, {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': String(r.retryAfter || 60),
        }
      });
}

export default async (req, context) => {
  const gate = limited(req);
  if (gate) return gate;

  let body = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      /* body non-JSON */
    }
  }

  const { action, payload, sessionToken } = body;

  if (action !== 'processUploadDoc') {
    return Response.json({
        success: false,
        message: 'Action not supported by ingest function: ' + action,
      }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  // Panggilan internal server-to-server (fireIngest dari submitApply) membawa
  // header x-ingest-secret — diteruskan ke handler agar sah tanpa sesi user.
  const internalSecret = req.headers.get('x-ingest-secret') || req.headers.get('X-Ingest-Secret') || undefined;

  let out;
  try {
    out = await handleProcessUploadDoc(payload || [], sessionToken, internalSecret);
  } catch (e) {
    out = { success: false, message: 'Error internal: ' + e.message };
  }

  return Response.json(out, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    }
  });
};

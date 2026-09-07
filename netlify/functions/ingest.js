'use strict';
const { handleProcessUploadDoc } = require('./_lib/actions-ingest');
const { verifyToken } = require('./_lib/session');
const rateLimit = require('./_lib/rate-limit');

// ingest.js — Standalone wrapper untuk Smart Ingestion.
// HANYA membundel actions-ingest.ts + deps-nya (pdf-parse, xlsx, mammoth).
// Function lain TIDAK perlu membundel library berat ini.
// Dipanggil dari api-client.js: processUploadDoc → 'ingest'

function clientIp(event) {
  const h = (event && event.headers) || {};
  const fwd = h['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return h['client-ip'] || h['x-real-ip'] || null;
}

// FIX (audit 2026-09-07): ingest adalah operasi BERAT (download 15s + panggilan
// Gemini) dan dulu TANPA rate limit sama sekali — sekarang 10 req/menit/IP.
function limited(event) {
  const ip = clientIp(event) || 'unknown';
  const r = rateLimit.check('ingest:' + ip, { limit: 10, windowMs: 60000 });
  return r.ok
    ? null
    : {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': String(r.retryAfter || 60),
        },
        body: JSON.stringify({
          success: false,
          message: 'Terlalu banyak permintaan. Coba lagi dalam ' + (r.retryAfter || 60) + ' detik.',
        }),
      };
}

exports.handler = async (event) => {
  const gate = limited(event);
  if (gate) return gate;

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    /* body non-JSON */
  }

  const { action, payload, sessionToken } = body;

  if (action !== 'processUploadDoc') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Action not supported by ingest function: ' + action,
      }),
    };
  }

  // Panggilan internal server-to-server (fireIngest dari submitApply) membawa
  // header x-ingest-secret — diteruskan ke handler agar sah tanpa sesi user.
  const h = (event && event.headers) || {};
  const internalSecret = String(h['x-ingest-secret'] || h['X-Ingest-Secret'] || '') || undefined;

  let out;
  try {
    out = await handleProcessUploadDoc(payload || [], sessionToken, internalSecret);
  } catch (e) {
    out = { success: false, message: 'Error internal: ' + e.message };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(out),
  };
};

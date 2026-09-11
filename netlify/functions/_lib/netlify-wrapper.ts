import { handleAction } from './handlers';
// netlify-wrapper.js — factory handler Netlify standar.
//
// Setiap file di netlify/functions/<nama>.js hanyalah:
//   exports.handler = makeHandler();
// dan seluruh logika dipusatkan di _lib/handlers.js (dispatch per action).

// Ambil IP klien dari header standar proxy/Netlify untuk rate limit (M3).
// FIX #1 (audit 2026-09-02): X-Forwarded-For leftmost is attacker-controlled.
// Prefer Netlify's own x-nf-client-connection-ip (unspoofable). Fall back to
// the RIGHTMOST entry in X-Forwarded-For (written by our own edge), not [0].
function clientIp(req: Request) {
  const headers = req && req.headers;
  if (!headers) return null;
  const getHeader = (name: string) => typeof headers.get === 'function' ? headers.get(name) : (headers as any)[name];

  const nf = getHeader('x-nf-client-connection-ip');
  if (nf) return String(nf).trim();
  const fwd = getHeader('x-forwarded-for');
  if (fwd) {
    const parts = String(fwd).split(',').map(s => s.trim()).filter(Boolean);
    // Rightmost entry is written by our own edge proxy — the trustworthy one.
    return parts[parts.length - 1] || null;
  }
  return getHeader('client-ip') || getHeader('x-real-ip') || null;
}

export function makeHandler() {
  return async (req: Request, context: any) => {
    let body: Record<string, any> = {};
    const url = new URL(req.url);
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        /* body non-JSON -> action kosong */
      }
    }

    // Keep-alive via GET (curl ?action=ping) — action boleh datang dari query
    // string kalau body kosong (mis. GitHub Actions keep-alive).
    if (!body.action) {
      body.action = body.action || url.searchParams.get('action') || undefined;
      if (body.action) {
        body.payload = body.payload || url.searchParams.get('payload') || undefined;
      }
    }

    let out;
    try {
      out = await handleAction(body.action, body.payload, body.sessionToken, {
        ip: clientIp(req),
      });
    } catch (e: any) {
      out = { success: false, message: 'Error internal: ' + e.message };
    }
    
    const baseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    };

    // Respons RAW dari handler (action 'ping': { statusCode: 200, body: 'pong' })
    // diteruskan apa adanya — tanpa JSON.stringify, tanpa bungkus tambahan.
    if (
      out &&
      typeof out === 'object' &&
      typeof out.statusCode === 'number' &&
      out.body !== undefined
    ) {
      return new Response(String(out.body), {
        status: out.statusCode,
        headers: baseHeaders
      });
    }
    
    return Response.json(out, { headers: baseHeaders });
  };
}

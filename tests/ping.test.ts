// ==========================================
// TESTS: ping.js — lightweight health check.
//
// ping.js memakai kontrak Netlify Functions **v2**
// (`export default (req, context) => Response`), BUKAN v1
// (`export const handler = (event) => ({ statusCode, body, headers })`).
// Tes lama masih memakai bentuk v1 (`import { handler }` + `result.statusCode`)
// sehingga selalu gagal — sekarang mengikuti kontrak v2 yang sebenarnya.
// ==========================================
import { describe, it, expect } from 'vitest';
import handler from '../netlify/functions/ping.js';

const callPing = () => handler(new Request('https://example.test/.netlify/functions/ping'), {});

describe('ping — health check endpoint', () => {
  it('returns status ok with required fields', async () => {
    const res = await callPing();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeDefined();
    expect(body.version).toBeDefined();
  });

  it('returns no-cache headers', async () => {
    const res = await callPing();
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-store');
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('uptime = detik non-negatif & tidak menurun antar panggilan', async () => {
    // uptime dihitung dalam DETIK (Math.floor(ms / 1000)), jadi jeda 10 ms tidak
    // akan menaikkannya. Yang bisa dijamin: integer >= 0 dan monoton tidak turun.
    const b1 = await (await callPing()).json();
    await new Promise((r) => setTimeout(r, 10));
    const b2 = await (await callPing()).json();
    expect(Number.isInteger(b1.uptime)).toBe(true);
    expect(b1.uptime).toBeGreaterThanOrEqual(0);
    expect(b2.uptime).toBeGreaterThanOrEqual(b1.uptime);
  });
});

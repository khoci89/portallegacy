// share-data.js — endpoint GET untuk viewer TSK publik.
//
// share.html memuat fetch('/api/share-data?job=KODE') (bukan POST action
// seperti fungsi lain). Netlify me-redirect /api/* -> /.netlify/functions/*,
// jadi file ini harus ada dengan nama share-data supaya redirect nyambung.
// Logika di handleShareData (netlify/functions/_lib/actions-share.js —
// Fase 1.1d: dipindah dari handlers.js, handlers tetap re-export untuk
// serve-static.mjs yang memakai loadHandlers().handleShareData).

import { handleShareData  } from './_lib/actions-share';

export default async (req, context) => {
  const url = new URL(req.url);
  const job = url.searchParams.get('job') || '';
  let out;
  try {
    out = await handleShareData(job);
  } catch (e) {
    out = { error: 'Error internal: ' + e.message };
  }
  return Response.json(out, {
    status: out.error ? 400 : 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    }
  });
};

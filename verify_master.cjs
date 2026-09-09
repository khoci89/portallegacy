const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve('.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const wa = '628123456789';

async function req(method, endpoint) {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, opts);
  if (!res.ok) {
    const txt = await res.text();
    console.error(`Error ${method} ${endpoint}: ${res.status} ${txt}`);
  } else {
    try { return await res.json(); } catch(e) { return null; }
  }
}

async function run() {
  const rows = await req('GET', `master_database_candidate?no_wa=eq.${wa}`);
  if (rows && rows.length > 0) {
    const r = rows[0];
    console.log("=== HASIL PENGECEKAN MASTER_DATABASE_CANDIDATE ===");
    console.log("Nama Lengkap   :", r.nama_lengkap);
    console.log("No WA          :", r.no_wa);
    console.log("Pas Photo      :", r.pas_photo);
    console.log("File CV        :", r.file_cv);
    console.log("JFT URL        :", r.jft_url);
    console.log("SSW URL        :", r.ssw_url);
    
    console.log("\n--- AI Data JSON ---");
    const aiData = JSON.parse(r.ai_data_json || '{}');
    console.log("Pendidikan     :", JSON.stringify(aiData.pendidikan, null, 2));
    console.log("Pendidikan JP  :", JSON.stringify(aiData.pendidikan_jp, null, 2));
    console.log("Pekerjaan      :", JSON.stringify(aiData.pekerjaan, null, 2));
    console.log("Pekerjaan JP   :", JSON.stringify(aiData.pekerjaan_jp, null, 2));
    
  } else {
    console.log("Data tidak ditemukan.");
  }
}
run();

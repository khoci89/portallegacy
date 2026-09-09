const fs = require('fs');
let content = fs.readFileSync('f:/Asjpow4v7-main/khoci921/js/10b_cv_builders.ts', 'utf8');

// Edu Sort
content = content.replace(
    /for \(let i = 1; i <= 5; i\+\+\) \{\n\s*let pE = Object.assign\(\{\}, eduList\[i \- 1\] \|\| \{\}\);/g,
    // Sort education chronologically / by level
  const tingkatOrder = { 'sd': 1, 'mi': 1, 'smp': 2, 'mts': 2, 'sma': 3, 'smk': 3, 'ma': 3, 'd1': 4, 'd2': 4, 'd3': 4, 'd4': 4, 's1': 4, 's2': 4, 'universitas': 4, 'lpk': 5 };
  const getTingkatVal = (t) => {
    const raw = String(t || '').toLowerCase();
    for (const [k, val] of Object.entries(tingkatOrder)) {
      if (raw.includes(k)) return val;
    }
    return 99;
  };
  const sortedEdu = (eduList || []).slice().sort((a, b) => {
    let tA = getTingkatVal(a?.tingkat);
    let tB = getTingkatVal(b?.tingkat);
    if (tA !== tB) return tA - tB;
    let yA = String(a?.masuk || a?.tahun_masuk || a?.tahunMasuk || '').match(/\\d{4}/);
    let yB = String(b?.masuk || b?.tahun_masuk || b?.tahunMasuk || '').match(/\\d{4}/);
    return (yA ? parseInt(yA[0]) : 9999) - (yB ? parseInt(yB[0]) : 9999);
  });
  for (let i = 1; i <= 5; i++) {
    let pE = Object.assign({}, sortedEdu[i - 1] || {});
);

// Job Sort
content = content.replace(
    /for \(let i = 1; i <= 3; i\+\+\) \{\n\s*let pJ = Object.assign\(\{\}, jobList\[i \- 1\] \|\| \{\}\);/g,
    // Sort jobs chronologically
  const sortedJob = (jobList || []).slice().sort((a, b) => {
    let yA = String(a?.masuk || a?.tahun_masuk || a?.tahunMasuk || '').match(/\\d{4}/);
    let yB = String(b?.masuk || b?.tahun_masuk || b?.tahunMasuk || '').match(/\\d{4}/);
    return (yA ? parseInt(yA[0]) : 9999) - (yB ? parseInt(yB[0]) : 9999);
  });
  for (let i = 1; i <= 3; i++) {
    let pJ = Object.assign({}, sortedJob[i - 1] || {});
);

// Fam Sort
content = content.replace(
    /for \(let i = 1; i <= 6; i\+\+\) \{\n\s*let kF = Object.assign\(\{\}, famList\[i \- 1\] \|\| \{\}\);/g,
    // Sort family by age descending
  const sortedFam = (famList || []).slice().sort((a, b) => {
    return (parseInt(b?.umur || b?.usia || 0)) - (parseInt(a?.umur || a?.usia || 0));
  });
  for (let i = 1; i <= 6; i++) {
    let kF = Object.assign({}, sortedFam[i - 1] || {});
);

// Gaji Pekerjaan
content = content.replace(
    /if \(i > 2 && !\\(pt_id \\|\\| msk \\|\\| klr\\)\\) continue;/g,
    let finalGaji = '\\u00A5&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-';
    if (gaji) {
      let gStr = String(gaji).trim().toLowerCase();
      if (gStr.includes('rp') || gStr.includes('rupiah') || gStr.includes('idr')) {
        let clean = gStr.replace(/rp\\.?\\s*|rupiah|idr/ig, '').trim();
        finalGaji = 'Rp ' + clean;
      } else {
        let clean = gStr.replace(/\\u00A5|yen/ig, '').trim();
        finalGaji = '\\u00A5&nbsp;&nbsp;&nbsp;' + clean;
      }
    }
    if (i > 2 && !(pt_id || msk || klr)) continue;
);

// Gaji Keluarga
content = content.replace(
    /if \(i > 3 && !\\(hub \\|\\| nm \\|\\| u \\|\\| p\\)\\) continue;/g,
    let finalGaji = '\\u00A5&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-';
    if (g) {
      let gStr = String(g).trim().toLowerCase();
      if (gStr.includes('rp') || gStr.includes('rupiah') || gStr.includes('idr')) {
        let clean = gStr.replace(/rp\\.?\\s*|rupiah|idr/ig, '').trim();
        finalGaji = 'Rp ' + clean;
      } else {
        let clean = gStr.replace(/\\u00A5|yen/ig, '').trim();
        finalGaji = '\\u00A5&nbsp;&nbsp;&nbsp;' + clean;
      }
    }
    if (i > 3 && !(hub || nm || u || p)) continue;
);

// Replace final job template
content = content.replace(/\\$\\{gaji \\? '\\u00A5&nbsp;&nbsp;&nbsp;' \+ gaji : '\\u00A5&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-'\\}/g, "\");

// Replace final fam template
content = content.replace(/\\$\\{g \\? '\\u00A5&nbsp;&nbsp;&nbsp;' \+ g : '\\u00A5&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-'\\}/g, "\");


fs.writeFileSync('f:/Asjpow4v7-main/khoci921/js/10b_cv_builders.ts', content, 'utf8');
console.log('done');

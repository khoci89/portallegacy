#!/bin/bash
# Pre-build Netlify functions: bundle each wrapper + _lib into standalone ESM
# This bypasses Netlify's esbuild which can't resolve .ts from CommonJS require()
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUNC_DIR="$ROOT/netlify/functions"
OUT_DIR="$ROOT/.netlify/functions"

echo "── Pre-building Netlify functions ──"

# PENTING (Windows / Git Bash): esbuild di repo ini adalah binary NATIVE Windows,
# jadi path gaya MSYS ("/e/Asjpow4v7-main/...") TIDAK bisa di-resolve olehnya.
# Dulu script ini meneruskan $ROOT absolut → esbuild gagal
# (`Could not resolve "/e/..."`) untuk SEMUA fungsi, termasuk yang tidak diubah.
# Karena itu bundling dijalankan dengan path RELATIF dari $ROOT — portabel di
# Linux/Netlify maupun Git Bash.
cd "$ROOT"

# Clean old built functions
rm -rf ".netlify/functions"
mkdir -p ".netlify/functions"

BUNDLED=0
FAILED=0
for wrapper in netlify/functions/*.js; do
  name=$(basename "$wrapper" .js)
  outfile=".netlify/functions/$name.js"

  # stderr DITANGKAP, bukan dibuang ke /dev/null — dulu pesan gagal tidak pernah
  # terlihat sehingga "❌ Failed" tanpa sebab sulit didiagnosis.
  if err=$(npx esbuild "$wrapper" \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=esm \
    --outfile="$outfile" \
    --log-level=error 2>&1); then
    BUNDLED=$((BUNDLED + 1))
  else
    echo "  ❌ Failed: $name"
    if [ -n "$err" ]; then echo "$err" | sed 's/^/     /'; fi
    FAILED=$((FAILED + 1))
  fi
done

echo "  ✅ Bundled: $BUNDLED functions"
if [ "$FAILED" -gt 0 ]; then
  echo "  ⚠️  Failed: $FAILED functions"
fi

# Also copy _lib as-is (for Netlify to find if needed)
cp -r "$FUNC_DIR/_lib" "$OUT_DIR/_lib" 2>/dev/null || true

# Ensure functions use ESM (root package.json has type:module)
echo '{"type": "module"}' > "$OUT_DIR/package.json"

echo "── Done ──"

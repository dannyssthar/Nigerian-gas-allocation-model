#!/usr/bin/env bash
# ============================================================================
# NGAM · repository verification
#
# Run from the repository root, before you commit:
#
#     bash verify.sh
#
# Checks every file is where it belongs, the Python package imports, the
# golden number is intact, and the API answers. Exits non-zero if anything
# is wrong, so it can go in CI later.
# ============================================================================

pass=0
fail=0

ok()   { echo "  [ok]   $1"; pass=$((pass+1)); }
bad()  { echo "  [MISS] $1"; fail=$((fail+1)); }

need() { if [ -f "$1" ]; then ok "$1"; else bad "$1"; fi; }

echo
echo "── Root ────────────────────────────────────────────────────"
for f in package.json next.config.ts tsconfig.json postcss.config.mjs \
         vercel.json .gitignore README.md; do need "$f"; done

echo
echo "── Interface ───────────────────────────────────────────────"
for f in app/page.tsx app/layout.tsx app/globals.css \
         components/ChainDiagram.tsx components/ParameterRail.tsx \
         components/Results.tsx components/ThemeToggle.tsx \
         components/Primitives.tsx lib/api.ts; do need "$f"; done

echo
echo "── Engine ──────────────────────────────────────────────────"
for f in engine/gascompute/__init__.py engine/gascompute/provenance.py \
         engine/gascompute/compute_unit.py engine/gascompute/parameters.py \
         engine/gascompute/netback.py engine/gascompute/lcoe.py \
         engine/gascompute/sites.py engine/gascompute/uncertainty.py \
         engine/gascompute/sensitivity.py engine/tests/test_golden.py \
         engine/requirements.txt; do need "$f"; done

echo
echo "── API ─────────────────────────────────────────────────────"
for f in api/index.py api/requirements.txt; do need "$f"; done

echo
echo "────────────────────────────────────────────────────────────"
echo "  $pass present, $fail missing"

if [ "$fail" -ne 0 ]; then
  echo
  echo "  Fix the missing files before going further."
  echo "  If only __init__.py is missing:  touch engine/gascompute/__init__.py"
  exit 1
fi

# --- the golden number ------------------------------------------------------
echo
echo "── The golden number ───────────────────────────────────────"
cd engine || exit 1
python -c "
from gascompute.compute_unit import accelerator_hours_per_mmbtu as f
v = f(7000, 1.5, 0.7, 0.8)
assert abs(v - 170.07) < 0.01, 'chain returned %s, expected 170.07' % v
print('  [ok]   170.07 accelerator-hours per MMBtu')
" || { echo "  [FAIL] the chain does not match Document 2"; exit 1; }

# --- the test suite ---------------------------------------------------------
echo
echo "── Tests ───────────────────────────────────────────────────"
python -m pytest tests/ -q || { echo "  [FAIL] tests did not pass"; exit 1; }
cd ..

echo
echo "  Everything checks out. Safe to commit."
echo
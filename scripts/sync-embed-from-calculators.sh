#!/usr/bin/env bash
# Mirror power UI into statistico-analytics/embed (same as CI).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/statistico-analytics/embed"
cp -f "$ROOT/statistico-calculators/power-sample-size-calculator/PowerCalculator.html" "$ROOT/statistico-analytics/embed/"
cp -f "$ROOT/statistico-calculators/power-sample-size-calculator/index-formulas.html"   "$ROOT/statistico-analytics/embed/"
echo "Synced embed from statistico-calculators/power-sample-size-calculator/ -> statistico-analytics/embed/"

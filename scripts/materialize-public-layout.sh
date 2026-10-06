#!/usr/bin/env bash
# Recreate the public URL paths from the organized source tree.
# GitHub Pages and Excel still request /statistico-calculators and
# /statistico-analytics/dialogs/views/<tool>. Those directories are not
# stored in git; this script rebuilds them before deploy.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

rm -rf statistico-calculators
mkdir -p statistico-calculators
cp -a specialized-tools/calculators/. statistico-calculators/

materialize_tool() {
  local name="$1"
  local src="specialized-tools/${name}"
  if [ -d "${src}/dialogs" ]; then
    rm -rf "statistico-analytics/dialogs/views/${name}"
    mkdir -p "statistico-analytics/dialogs/views/${name}"
    cp -a "${src}/dialogs/." "statistico-analytics/dialogs/views/${name}/"
  fi
  if [ -d "${src}/taskpane" ]; then
    rm -rf "statistico-analytics/taskpane/${name}"
    mkdir -p "statistico-analytics/taskpane/${name}"
    cp -a "${src}/taskpane/." "statistico-analytics/taskpane/${name}/"
  fi
}

for name in pareto prepare publication-tables multivariable segmentation; do
  materialize_tool "$name"
done

test -f statistico-calculators/power-sample-size-calculator/PowerCalculator.html
test -f statistico-analytics/dialogs/views/pareto/pareto-input.html
test -f statistico-analytics/taskpane/prepare/prepare-intent.js

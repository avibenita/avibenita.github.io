# Mirror power UI into statistico-analytics/embed (same as CI).
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "statistico-calculators\power-sample-size-calculator"
$dst = Join-Path $root "statistico-analytics\embed"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Force (Join-Path $src "index-calculator.html") (Join-Path $dst "index-calculator.html")
Copy-Item -Force (Join-Path $src "index-formulas.html")   (Join-Path $dst "index-formulas.html")
Write-Host "Synced embed from statistico-calculators/power-sample-size-calculator/ -> statistico-analytics/embed/"

# Docker와 동일하게 standalone 실행 전 static/public 복사 (로컬 prod 점검용)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$standalone = Join-Path $root '.next\standalone'
if (-not (Test-Path (Join-Path $standalone 'server.js'))) {
    Write-Error 'Run npm run build first (.next/standalone missing).'
}
$staticDest = Join-Path $standalone '.next\static'
$publicDest = Join-Path $standalone 'public'
Remove-Item $staticDest, $publicDest -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $root '.next\static') $staticDest -Recurse
Copy-Item (Join-Path $root 'public') $publicDest -Recurse
Write-Host 'Standalone assets ready — run: $env:HOSTNAME="127.0.0.1"; $env:PORT="3000"; node .next/standalone/server.js'

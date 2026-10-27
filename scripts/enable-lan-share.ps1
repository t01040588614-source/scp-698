# 같은 Wi‑Fi/사무실 LAN에서 다른 PC가 MarketLens에 접속하도록 방화벽·CORS 설정
# 관리자 PowerShell:  Set-ExecutionPolicy Bypass -Scope Process; .\scripts\enable-lan-share.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Get-LanIPv4 {
    Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -notmatch '^127\.' -and
            $_.InterfaceAlias -notmatch 'WSL|Hyper-V|Default Switch|Loopback' -and
            $_.PrefixOrigin -ne 'WellKnown'
        } |
        Sort-Object -Property InterfaceMetric |
        Select-Object -ExpandProperty IPAddress -First 1
}

$lanIp = Get-LanIPv4
if (-not $lanIp) {
    Write-Host 'LAN IPv4를 찾지 못했습니다. 이더넷/Wi‑Fi 연결을 확인하세요.' -ForegroundColor Red
    exit 1
}

$ports = @(3000, 8000)
foreach ($port in $ports) {
    $name = "MarketLens-TCP-$port"
    $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
    if ($existing) {
        Enable-NetFirewallRule -DisplayName $name | Out-Null
    } else {
        New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow `
            -Protocol TCP -LocalPort $port -Profile Private, Domain | Out-Null
    }
}

$envPath = Join-Path $root '.env'
$origin = "http://${lanIp}:3000"
if (Test-Path $envPath) {
    $text = Get-Content -LiteralPath $envPath -Raw -Encoding UTF8
    if ($text -notmatch [regex]::Escape($origin)) {
        if ($text -match 'CORS_ORIGINS=(\[[^\]]*\])') {
            $json = $Matches[1] | ConvertFrom-Json
            $list = @($json) + $origin | Select-Object -Unique
            $newJson = ($list | ConvertTo-Json -Compress)
            $text = $text -replace 'CORS_ORIGINS=\[[^\]]*\]', "CORS_ORIGINS=$newJson"
        } else {
            $text += "`nCORS_ORIGINS=[`"http://localhost:3000`",`"http://127.0.0.1:3000`",`"$origin`"]`n"
        }
        Set-Content -LiteralPath $envPath -Value $text.TrimEnd() -Encoding UTF8 -NoNewline
        Write-Host "Updated .env CORS_ORIGINS with $origin"
    }
}

Write-Host ''
Write-Host '=== 팀원에게 보낼 주소 (같은 LAN / Wi‑Fi) ===' -ForegroundColor Green
Write-Host "  http://${lanIp}:3000"
Write-Host ''
Write-Host '주의:' -ForegroundColor Yellow
Write-Host '  - localhost / 127.0.0.1 링크는 본인 PC에서만 됩니다.'
Write-Host '  - 집 밖(인터넷)에서는 공유기 포트포워딩 또는 Cloudflare Tunnel 등이 필요합니다.'
Write-Host '  - ZIP 공유는 팀원 PC에서 각자 docker compose up --build 가 필요합니다.'
Write-Host ''
Write-Host 'Docker 재기동: docker compose up -d --build api web'

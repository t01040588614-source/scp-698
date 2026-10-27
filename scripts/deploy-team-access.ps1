# 팀원·다른 PC가 접속하는 Docker 배포 (포트 80 단일 진입)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Host 'Created .env from .env.example'
}

Write-Host 'Building and starting stack (share mode, port 80)...' -ForegroundColor Cyan
docker compose -f docker-compose.yml -f docker-compose.share.yml up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$lan = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notmatch '^127\.' -and
        $_.InterfaceAlias -notmatch 'WSL|Hyper-V|Default Switch|Loopback'
    } |
    Select-Object -ExpandProperty IPAddress -First 1

Write-Host ''
Write-Host '=== 팀원에게 보낼 주소 (같은 Wi-Fi / LAN) ===' -ForegroundColor Green
if ($lan) { Write-Host "  http://${lan}/" }
Write-Host '  (localhost는 본인 PC 전용 — 공유 금지)'
Write-Host ''

$ruleName = 'MarketLens-TCP-80'
try {
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow `
            -Protocol TCP -LocalPort 80 -Profile Private, Domain | Out-Null
        Write-Host 'Firewall: opened TCP 80 (Private/Domain)' -ForegroundColor Green
    } else {
        Enable-NetFirewallRule -DisplayName $ruleName | Out-Null
        Write-Host 'Firewall: TCP 80 rule already present' -ForegroundColor Green
    }
} catch {
    Write-Host 'Firewall: 관리자 PowerShell에서 TCP 80 허용 필요' -ForegroundColor Yellow
    Write-Host '  New-NetFirewallRule -DisplayName MarketLens-TCP-80 -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80 -Profile Private,Domain'
}

Write-Host ''
Write-Host '인터넷(집 밖) 공유: Cloudflare Quick Tunnel 예시' -ForegroundColor Cyan
Write-Host '  winget install Cloudflare.cloudflared'
Write-Host '  cloudflared tunnel --url http://127.0.0.1:80'

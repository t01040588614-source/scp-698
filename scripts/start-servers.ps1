param(
    [switch]$Clean,
    [switch]$SkipClean,
    [switch]$Dev,
    # 프로덕션(npm run build + start) — Dev와 반대
    [switch]$Prod,
    # Windows 로그인 자동 기동 — Enter 대기 없음, .next 유지, 빌드 있으면 생략
    [switch]$AutoStart,
    [switch]$NoBrowser
)

if ($Prod) { $Dev = $false }

if ($AutoStart -and -not $Clean -and -not $SkipClean) {
    $SkipClean = $true
}

$ErrorActionPreference = 'Continue'
try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
} catch { }

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend = Join-Path $root 'stock-backend'
$frontend = Join-Path $root 'my-frontend'
$venvPy = Join-Path $backend 'venv\Scripts\python.exe'
$venvPip = Join-Path $backend 'venv\Scripts\pip.exe'
$verifyScript = Join-Path $root 'scripts\verify-stack.ps1'

function Pause-IfInteractive([string]$Message = 'Press Enter to close') {
    if (-not $AutoStart) {
        Read-Host $Message
    }
}

function Test-FrontendBuildPresent {
    return Test-Path (Join-Path $frontend '.next\BUILD_ID')
}

function Open-DashboardBrowser {
    if ($NoBrowser) { return }
    Start-Process 'http://127.0.0.1:3000/markets'
}

function Stop-PortListener([int]$Port) {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id ($_.OwningProcess) -Force -ErrorAction SilentlyContinue }
}

function Test-CommandOnPath([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-BackendDatabaseUrl {
    $envPath = Join-Path $backend '.env'
    if (-not (Test-Path $envPath)) { return '' }
    foreach ($line in Get-Content $envPath -ErrorAction SilentlyContinue) {
        if ($line -match '^\s*DATABASE_URL\s*=\s*(.+)\s*$') {
            return $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
    return ''
}

function Test-WantFullStack {
    return -not (Test-Path (Join-Path $backend '.use_sqlite'))
}

function Test-DockerEngine {
    if (-not (Test-CommandOnPath 'docker')) { return $false }
    docker info *> $null
    return $LASTEXITCODE -eq 0
}

function Wait-DockerEngine([int]$MaxSeconds = 120) {
    if (Test-DockerEngine) { return $true }
    $dockerExe = Join-Path ${env:ProgramFiles} 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dockerExe) {
        Write-Host '  Starting Docker Desktop (waiting for engine)...'
        Start-Process -FilePath $dockerExe -ErrorAction SilentlyContinue | Out-Null
    }
    $deadline = (Get-Date).AddSeconds($MaxSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-DockerEngine) { return $true }
        Start-Sleep -Seconds 5
    }
    return $false
}

function Ensure-RootDockerEnv {
    $rootEnv = Join-Path $root '.env'
    $rootExample = Join-Path $root '.env.example'
    if (-not (Test-Path $rootEnv) -and (Test-Path $rootExample)) {
        Copy-Item -Path $rootExample -Destination $rootEnv
        Write-Host '  Created root .env (docker compose Postgres)'
    }
}

function Set-BackendDatabasePostgres {
    $envPath = Join-Path $backend '.env'
    if (-not (Test-Path $envPath)) { return $false }
    $pgUrl = 'postgresql+asyncpg://krstock:krstockpass@localhost:5432/krstock'
    $current = Get-BackendDatabaseUrl
    if ($current -match 'postgresql') { return $false }
    $lines = Get-Content $envPath -Encoding UTF8
    $out = New-Object System.Collections.Generic.List[string]
    $replaced = $false
    foreach ($line in $lines) {
        if ($line -match '^\s*DATABASE_URL\s*=') {
            if (-not $replaced) {
                if ($line -match 'sqlite') {
                    $out.Add("# $line  # auto: full-stack")
                }
                $out.Add("DATABASE_URL=$pgUrl")
                $replaced = $true
            }
        } else {
            $out.Add($line)
        }
    }
    if (-not $replaced) {
        $out.Add("DATABASE_URL=$pgUrl")
    }
    Set-Content -Path $envPath -Value $out -Encoding UTF8
    Write-Host '  DATABASE_URL set to PostgreSQL (accounts, screener, DOCX DB)' -ForegroundColor Cyan
    return $true
}

function Ensure-IntegrationDataDir {
    $dataDir = Join-Path $backend 'data'
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    }
    $example = Join-Path $dataDir 'integration_keys.json.example'
    $target = Join-Path $dataDir 'integration_keys.json'
    if ((Test-Path $example) -and -not (Test-Path $target)) {
        Copy-Item $example $target
        Write-Host '  Created data/integration_keys.json (API keys UI)'
    }
}

function Ensure-BackendEnv {
    $envPath = Join-Path $backend '.env'
    $example = Join-Path $backend '.env.example'
    if (-not (Test-Path $envPath) -and (Test-Path $example)) {
        Copy-Item -Path $example -Destination $envPath
        Write-Host '  Created stock-backend/.env from .env.example'
    }
}

function Ensure-PostgresDocker {
    if (-not (Test-WantFullStack)) {
        Write-Host '  DB: stock-backend\.use_sqlite found — skipping Docker Postgres (quotes API only)'
        return $true
    }
    if (-not (Test-CommandOnPath 'docker')) {
        Write-Host '  [WARN] docker CLI not found — use stock-backend\.use_sqlite or install Docker Desktop' -ForegroundColor Yellow
        return $false
    }
    if (-not (Wait-DockerEngine)) {
        Write-Host '  [WARN] Docker Desktop is NOT running (dockerDesktopLinuxEngine pipe missing).' -ForegroundColor Yellow
        Write-Host '         Start Docker Desktop and re-run, OR create stock-backend\.use_sqlite for quotes-only mode.' -ForegroundColor Yellow
        return $false
    }
    $compose = Join-Path $root 'docker-compose.yml'
    if (-not (Test-Path $compose)) {
        Write-Host '  [WARN] docker-compose.yml not found' -ForegroundColor Yellow
        return $false
    }
    Ensure-RootDockerEnv
    Write-Host '  docker compose up -d db (PostgreSQL 16)...'
    Push-Location $root
    $env:COMPOSE_PROJECT_NAME = 'krstock'
    & docker compose -p krstock up -d db 2>&1 | ForEach-Object { Write-Host "  $_" }
    $dockerExit = $LASTEXITCODE
    Pop-Location
    if ($dockerExit -ne 0) {
        Write-Host '  [WARN] Docker DB failed — ensure Docker Desktop is running, then retry' -ForegroundColor Yellow
        return $false
    }
    if (Set-BackendDatabasePostgres) {
        $script:BackendEnvChanged = $true
    }
    $ready = $false
    for ($i = 0; $i -lt 45; $i++) {
        try {
            $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -WarningAction SilentlyContinue -ErrorAction Stop
            if ($tcp.TcpTestSucceeded) {
                $ready = $true
                break
            }
        } catch { }
        Write-Host "  ... waiting for Postgres ($($i * 2)s)"
        Start-Sleep -Seconds 2
    }
    if (-not $ready) {
        Write-Host '  [WARN] Postgres port 5432 not ready — DB init may be skipped' -ForegroundColor Yellow
    }
    return $ready
}

function Ensure-FrontendEnv {
    $envPath = Join-Path $frontend '.env.local'
    $example = Join-Path $frontend '.env.local.example'
    $default = @"
# 브라우저는 /api/v1 프록시 사용 (next.config rewrites)
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000/api/v1/ws/stocks
STOCK_API_PROXY=http://127.0.0.1:8000
"@
    if (-not (Test-Path $example)) {
        Set-Content -Path $example -Value $default -Encoding UTF8
    }
    if (-not (Test-Path $envPath)) {
        Write-Host '  Created .env.local (API proxy and WebSocket URLs)'
        Set-Content -Path $envPath -Value $default -Encoding UTF8
    }
}

function Test-BackendReady {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/health' -TimeoutSec 8
        if ($health.status -ne 'healthy') { return $false }
        $cache = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/market/cache-status' -TimeoutSec 8
        return ([int]$cache.korea_count -ge 1)
    } catch {
        return $false
    }
}

function Test-FrontendReady {
    try {
        $page = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/markets' -UseBasicParsing -TimeoutSec 20
        if ($page.StatusCode -ne 200) { return $false }
        $html = $page.Content
        if ($html -match '"statusCode"\s*:\s*500' -or $html -match 'Cannot find module') { return $false }
        if ($html -match 'missing required error components') { return $false }
        if ($html -notmatch 'app-main|inv-investing|desktop-header') { return $false }
        if ($html -match 'href="(/_next/static/css/[^"]+\.css)') {
            $cssUrl = 'http://127.0.0.1:3000' + $Matches[1]
            $css = Invoke-WebRequest -Uri $cssUrl -UseBasicParsing -TimeoutSec 12
            if ($css.StatusCode -ne 200 -or $css.Content.Length -lt 400) { return $false }
            if ($css.Content -notmatch '--page-background|\.container') { return $false }
            return $true
        }
        return ($html.Length -gt 2000)
    } catch {
        return $false
    }
}

function Start-BackendProcess([bool]$UseDev) {
    $reloadFlag = if ($UseDev) { ' --reload' } else { '' }
    $backendCmd = "cd /d `"$backend`" && `"$venvPip`" install -r requirements.txt -q && `"$venvPy`" -m uvicorn app.main:app --host 127.0.0.1 --port 8000$reloadFlag"
    Start-Process cmd.exe -WindowStyle Minimized -ArgumentList @('/k', 'title Stock Backend && ' + $backendCmd) | Out-Null
}

function Start-FrontendProcess([bool]$UseDev) {
    if ($UseDev) {
        $frontendCmd = "cd /d `"$frontend`" && npm run dev"
    } else {
        $frontendCmd = "cd /d `"$frontend`" && npm run start"
    }
    Start-Process cmd.exe -WindowStyle Minimized -ArgumentList @('/k', 'title Stock Frontend && ' + $frontendCmd) | Out-Null
}

function Invoke-FrontendBuild {
    Write-Host '  Next.js production build (1-2 min)...'
    Push-Location $frontend
    npm run build
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) {
        Write-Host '  [ERROR] npm run build failed — check Stock Frontend window' -ForegroundColor Red
        Pause-IfInteractive
        exit 1
    }
}

function Invoke-BackendWarmup {
    if (-not (Test-BackendReady)) { return }
    try {
        Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/integrations/apply' -Method Post -TimeoutSec 30 | Out-Null
        Write-Host '  integrations/apply completed (API keys and quotes)'
    } catch {
        Write-Host '  [NOTE] skipped integrations/apply (backend may still be warming up)'
    }
}

function Start-BackgroundDocxSeed {
    if (-not (Test-WantFullStack)) { return }
    $dbUrl = Get-BackendDatabaseUrl
    if ($dbUrl -notmatch 'postgresql') { return }
    $marker = Join-Path $backend 'data\.full_stack_seeded'
    if (Test-Path $marker) { return }
    $seedCmd = "cd /d `"$backend`" && `"$venvPy`" scripts\ingest_docx_all.py --max-codes 40 && echo ok>data\.full_stack_seeded"
    Start-Process cmd.exe -WindowStyle Minimized -ArgumentList @('/c', 'title DOCX ETL && ' + $seedCmd) | Out-Null
    Write-Host '  [background] DOCX ETL started (first run, max 40 symbols)'
}

function Write-FeatureLinks {
    Write-Host '  Quick links:'
    Write-Host '    Markets    http://127.0.0.1:3000/markets'
    Write-Host '    Stocks     http://127.0.0.1:3000/stocks'
    Write-Host '    Portfolio  http://127.0.0.1:3000/portfolio'
    Write-Host '    API keys   http://127.0.0.1:3000/tools/integrations'
    Write-Host '    Swagger    http://127.0.0.1:8000/docs'
}

$script:BackendEnvChanged = $false

function Wait-ServersReady([int]$MaxIterations) {
    $backendOk = $false
    $frontendOk = $false
    for ($i = 0; $i -lt $MaxIterations; $i++) {
        if (-not $backendOk) { $backendOk = Test-BackendReady }
        if ($backendOk -and -not $frontendOk) { $frontendOk = Test-FrontendReady }
        if ($backendOk -and $frontendOk) { break }
        $bStat = if ($backendOk) { 'OK' } else { 'wait' }
        $fStat = if ($frontendOk) { 'OK' } else { 'wait' }
        Write-Host "  ... $($i * 2)s (backend:$bStat frontend:$fStat)"
        Start-Sleep -Seconds 2
    }
    return @{ Backend = $backendOk; Frontend = $frontendOk }
}

Write-Host '=========================================='
Write-Host ' MarketLens — starting stack'
if ($AutoStart) { Write-Host ' (auto-start mode)' }
Write-Host '=========================================='
Write-Host ''

Write-Host '[1/8] Tools (Python, Node; Docker recommended)...'
if (-not (Test-CommandOnPath 'python')) {
    Write-Host '  [ERROR] python not found — install Python 3.11+ and add to PATH' -ForegroundColor Red
    Pause-IfInteractive
    exit 1
}
if (-not (Test-CommandOnPath 'npm')) {
    Write-Host '  [ERROR] npm not found — install Node.js 18+' -ForegroundColor Red
    Pause-IfInteractive
    exit 1
}

Write-Host '[2/8] Free ports 8000 and 3000...'
Stop-PortListener 8000
Stop-PortListener 3000
Start-Sleep -Seconds 1

Write-Host '[3/8] Environment (.env, Postgres, venv, npm)...'
Ensure-BackendEnv
Ensure-IntegrationDataDir
Ensure-PostgresDocker | Out-Null
if (-not (Test-Path $venvPy)) {
    Write-Host '  Creating Python venv...'
    Push-Location $backend
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  [ERROR] venv creation failed — check Python 3.11+' -ForegroundColor Red
        Pause-IfInteractive
        exit 1
    }
    Pop-Location
}
Ensure-FrontendEnv
if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    Write-Host '  npm install (first time)...'
    Push-Location $frontend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  [ERROR] npm install failed' -ForegroundColor Red
        Pop-Location
        Pause-IfInteractive
        exit 1
    }
    Pop-Location
}

if ($Clean -or (-not $SkipClean -and -not $Dev)) {
    Write-Host '  Clearing .next cache...'
    Remove-Item -Recurse -Force (Join-Path $frontend '.next') -ErrorAction SilentlyContinue
}

Write-Host '[4/8] Start backend and frontend...'
if ($Dev) {
    Write-Host '  Dev mode: save files to hot-reload (Fast Refresh / uvicorn --reload)' -ForegroundColor Cyan
}
Start-BackendProcess -UseDev:$Dev
Start-Sleep -Seconds 3
if (-not $Dev) {
    if ($AutoStart -and (Test-FrontendBuildPresent)) {
        Write-Host '  AutoStart: reusing existing Next.js build (npm run start)'
    } else {
        Invoke-FrontendBuild
    }
} else {
    Write-Host '  npm run dev (hot reload, no build step)'
}
Start-FrontendProcess -UseDev:$Dev

Write-Host '[5/8] Wait for ready (quotes ~30-90s, up to 4 min)...'
$status = Wait-ServersReady -MaxIterations 120

if (-not $status.Frontend -and $status.Backend) {
    Write-Host '[4b] Frontend not ready — clearing .next and restarting...'
    Stop-PortListener 3000
    Start-Sleep -Seconds 2
    Remove-Item -Recurse -Force (Join-Path $frontend '.next') -ErrorAction SilentlyContinue
    if (-not $Dev) { Invoke-FrontendBuild }
    Start-FrontendProcess -UseDev:$Dev
    Start-Sleep -Seconds 8
    $retry = Wait-ServersReady -MaxIterations 90
    if ($retry.Frontend) { $status.Frontend = $true }
}

Write-Host '[6/8] Warmup (integrations apply)...'
Invoke-BackendWarmup
Start-BackgroundDocxSeed

Write-Host '[7/8] verify-stack.ps1...'
$verifyOk = $false
if ($status.Backend -and $status.Frontend -and (Test-Path $verifyScript)) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $verifyScript
    if ($LASTEXITCODE -eq 0) { $verifyOk = $true }
} elseif (-not (Test-Path $verifyScript)) {
    Write-Host '  verify-stack.ps1 missing — using HTTP ready checks only'
    $verifyOk = ($status.Backend -and $status.Frontend)
}

Write-Host '[8/8] Done...'
if ($status.Backend -and $status.Frontend -and $verifyOk) {
    Write-Host ''
    Write-Host 'All services ready.' -ForegroundColor Green
    Write-FeatureLinks
    Write-Host ''
    Write-Host 'Stop: stop-dev.bat'
    Open-DashboardBrowser
    exit 0
}

Write-Host ''
Write-Host 'Some steps did not complete.' -ForegroundColor Yellow
Write-Host "  Backend:  $(if ($status.Backend) { 'OK' } else { 'wait/error — check Stock Backend window' })"
Write-Host "  Frontend: $(if ($status.Frontend) { 'OK' } else { 'wait/error — check Stock Frontend window' })"
Write-Host "  Verify:   $(if ($verifyOk) { 'OK' } else { 'failed — run scripts\verify-stack.ps1' })"
Write-Host '  Broken CSS: run stop-dev.bat then start again (.next rebuild)'
Write-Host '  Manual check: http://127.0.0.1:8000/api/v1/market/cache-status'
if ($status.Backend) {
    Open-DashboardBrowser
}
Pause-IfInteractive
exit 1

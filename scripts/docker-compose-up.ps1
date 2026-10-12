param(
    [switch]$Build,
    [switch]$Down
)

$ErrorActionPreference = "Stop"
try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
} catch { }

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$envExample = Join-Path $root ".env.example"
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "Created .env from .env.example"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker CLI not found. Install Docker Desktop." -ForegroundColor Red
    exit 1
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker engine is not running. Start Docker Desktop, then retry." -ForegroundColor Red
    exit 1
}

$env:COMPOSE_PROJECT_NAME = "krstock"

if ($Down) {
    docker compose down
    exit $LASTEXITCODE
}

$args = @("compose", "up")
if ($Build) { $args += "--build" }
$args += @("-d", "db", "api", "web")

Write-Host "docker $($args -join ' ') ..."
& docker @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Waiting for API health..."
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
    try {
        $h = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health" -TimeoutSec 5
        if ($h.status -eq "healthy") {
            $ok = $true
            break
        }
    } catch { }
    Start-Sleep -Seconds 2
}

if (-not $ok) {
    Write-Host "[WARN] API not healthy yet — check: docker compose logs api" -ForegroundColor Yellow
} else {
    Write-Host "API OK"
}

Write-Host ""
Write-Host "  Web:     http://127.0.0.1:3000/markets"
Write-Host "  API:     http://127.0.0.1:8000/docs"
Write-Host "  Stop:    docker compose down"
Write-Host ""

Start-Process "http://127.0.0.1:3000/markets"

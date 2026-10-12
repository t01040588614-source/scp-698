# MarketLens — Windows 로그인 후 백그라운드 기동 (작업 스케줄러에서 호출)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$startScript = Join-Path $root 'scripts\start-servers.ps1'
$logDir = Join-Path $env:LOCALAPPDATA 'MarketLens'
$logFile = Join-Path $logDir 'autostart.log'

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $logFile -Value "`n========== $stamp logon start ==========" -Encoding UTF8

function Wait-DockerEngine([int]$MaxSeconds = 180) {
    $dockerExe = Join-Path ${env:ProgramFiles} 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dockerExe) {
        Start-Process -FilePath $dockerExe -ErrorAction SilentlyContinue | Out-Null
    }
    $deadline = (Get-Date).AddSeconds($MaxSeconds)
    while ((Get-Date) -lt $deadline) {
        docker info *> $null
        if ($LASTEXITCODE -eq 0) {
            Add-Content -Path $logFile -Value 'Docker engine ready.' -Encoding UTF8
            return $true
        }
        Start-Sleep -Seconds 5
    }
    Add-Content -Path $logFile -Value 'Docker engine not ready (continuing — quotes-only or retry later).' -Encoding UTF8
    return $false
}

Wait-DockerEngine | Out-Null

$params = @{ AutoStart = $true }
if ($env:MARKETLENS_NO_BROWSER -eq '1') {
    $params.NoBrowser = $true
}

try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startScript @params 2>&1 |
        Tee-Object -FilePath $logFile -Append
    exit $LASTEXITCODE
} catch {
    $_ | Out-String | Add-Content -Path $logFile -Encoding UTF8
    exit 1
}

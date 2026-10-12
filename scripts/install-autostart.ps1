# Register MarketLens to run after Windows logon (Task Scheduler)
param(
    [int]$DelaySeconds = 90,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$TaskName = 'MarketLens-AutoStart'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$launcher = Join-Path $root 'scripts\start-at-logon.ps1'

if (-not (Test-Path $launcher)) {
    Write-Host "[ERROR] Missing: $launcher" -ForegroundColor Red
    exit 1
}

if ($NoBrowser) {
    [Environment]::SetEnvironmentVariable('MARKETLENS_NO_BROWSER', '1', 'User')
} else {
    [Environment]::SetEnvironmentVariable('MARKETLENS_NO_BROWSER', $null, 'User')
}

$argList = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argList -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = "PT${DelaySeconds}S"
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description 'MarketLens auto-start after logon (backend + frontend)' | Out-Null

Write-Host ''
Write-Host 'Autostart registered.' -ForegroundColor Green
Write-Host "  Task:    $TaskName"
Write-Host "  Trigger: $DelaySeconds sec after logon"
Write-Host "  Script:  $launcher"
Write-Host "  Log:     $env:LOCALAPPDATA\MarketLens\autostart.log"
if ($NoBrowser) { Write-Host '  Browser: disabled (-NoBrowser)' }
Write-Host ''
Write-Host 'Tip: Enable Docker Desktop -> Start when you sign in'
Write-Host 'Remove: scripts\uninstall-autostart.ps1'
Write-Host ''

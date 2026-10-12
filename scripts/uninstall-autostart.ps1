$TaskName = 'MarketLens-AutoStart'
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "등록된 작업 없음: $TaskName"
    exit 0
}
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "자동 기동 해제 완료: $TaskName" -ForegroundColor Green

# DOCX 일일 배치: ETL(전체 유니버스) + 계좌 스냅샷
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "== ingest_docx_all (full universe) =="
python scripts/ingest_docx_all.py --max-codes 0

Write-Host "== daily_snapshot_job =="
python scripts/daily_snapshot_job.py

Write-Host "daily-docx.ps1 finished."

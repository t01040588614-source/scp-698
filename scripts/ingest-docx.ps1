# DOCX ETL — PostgreSQL + stock-backend venv
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root "stock-backend\venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
  Write-Error "venv 없음. stock-backend에서 python -m venv venv 후 requirements 설치하세요."
}
& $py (Join-Path $root "stock-backend\scripts\ingest_docx_all.py")

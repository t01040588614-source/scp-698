$ErrorActionPreference = 'Continue'
$fail = 0

function Test-Step($name, [scriptblock]$block) {
    try {
        & $block
        Write-Host "[OK] $name" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $name - $($_.Exception.Message)" -ForegroundColor Red
        $script:fail++
    }
}

function Get-FrontendPage($path, [int]$retries = 3) {
    $url = 'http://127.0.0.1:3000' + $path
    $last = $null
    for ($i = 0; $i -lt $retries; $i++) {
        try {
            return Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 30
        } catch {
            $last = $_
            Start-Sleep -Milliseconds 800
        }
    }
    throw $last.Exception
}

Write-Host "=== MarketLens stack check ===" -ForegroundColor Cyan

Test-Step "Backend health" {
    $h = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/health/" -TimeoutSec 5
    if ($h.status -ne 'healthy') { throw "status=$($h.status)" }
}

Test-Step "Market cache (korea>=1)" {
    $c = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/market/cache-status" -TimeoutSec 5
    if ([int]$c.korea_count -lt 1) { throw "korea_count=$($c.korea_count)" }
}

Test-Step "Korea stocks API" {
    $k = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/stocks/korea" -TimeoutSec 30
    if ($k.Count -lt 1) { throw "empty list" }
}

Test-Step "Frontend proxy /api/v1/stocks/korea" {
    $r = Invoke-WebRequest "http://127.0.0.1:3000/api/v1/stocks/korea" -UseBasicParsing -TimeoutSec 20
    if ($r.StatusCode -ne 200 -or $r.Content.Length -lt 100) { throw "bad response" }
}

Test-Step "Frontend /korea page" {
    $p = Get-FrontendPage "/korea"
    if ($p.StatusCode -ne 200) { throw "status=$($p.StatusCode)" }
    if ($p.Content -like '*"statusCode":500*' -or $p.Content -like '*Cannot find module*') {
        throw 'next cache error: stop-dev.bat then run launch bat'
    }
    # Dev: /_next/static/css/app/layout.css?v=…  Prod: /_next/static/css/<hash>.css
    if ($p.Content -notmatch 'href="(/_next/static/css/[^"]+\.css[^"]*)"') {
        throw 'CSS bundle link missing'
    }
    $cssPath = $Matches[1]
    $css = Invoke-WebRequest ('http://127.0.0.1:3000' + $cssPath) -UseBasicParsing -TimeoutSec 15
    if ($css.StatusCode -ne 200 -or $css.Content.Length -lt 400) { throw 'CSS empty or 404' }
}

Test-Step "Integrations hub API" {
    $i = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/integrations" -TimeoutSec 10
    if (-not $i.integrations) { throw "no integrations list" }
}

Test-Step "DOCX stocks API (/api/v1/stocks)" {
    $s = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/stocks?limit=5" -TimeoutSec 30
    if ($null -eq $s) { throw "empty" }
}

Test-Step "Accounts API (PostgreSQL)" {
    try {
        Invoke-RestMethod "http://127.0.0.1:8000/api/v1/accounts?ownerId=user1" -TimeoutSec 15 | Out-Null
    } catch {
        $msg = $_.Exception.Message
        if ($msg -match '500|503|connection|postgres|asyncpg') {
            throw 'DB not ready: Docker db or DATABASE_URL'
        }
        throw
    }
}

Test-Step "Frontend /portfolio" {
    $p = Get-FrontendPage "/portfolio"
    if ($p.StatusCode -ne 200) { throw "status=$($p.StatusCode)" }
}

Test-Step "Frontend /tools/integrations" {
    $p = Get-FrontendPage "/tools/integrations"
    if ($p.StatusCode -ne 200) { throw "status=$($p.StatusCode)" }
}

Test-Step "Stock history API (005930 1m)" {
    $h = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/stocks/history?symbol=005930&market=korea&period=1m" -TimeoutSec 45
    if (-not $h.points -or $h.points.Count -lt 5) { throw "too few bars" }
}

Test-Step "News API" {
    $n = Invoke-RestMethod "http://127.0.0.1:8000/api/v1/news" -TimeoutSec 10
    if (-not $n.data -or $n.data.Count -lt 1) { throw "empty news" }
}

Test-Step "Frontend /charts" {
    $p = Get-FrontendPage "/charts"
    if ($p.StatusCode -ne 200) { throw "status=$($p.StatusCode)" }
}

Test-Step "Frontend /quote/korea/005930" {
    $p = Get-FrontendPage "/quote/korea/005930"
    if ($p.StatusCode -ne 200) { throw "status=$($p.StatusCode)" }
}

Test-Step "Frontend /us" {
    $r = Get-FrontendPage "/us"
    if ($r.StatusCode -ne 200) { throw "status=$($r.StatusCode)" }
}
Test-Step "Frontend /search" {
    $r = Get-FrontendPage "/search"
    if ($r.StatusCode -ne 200) { throw "status=$($r.StatusCode)" }
}
Test-Step "Frontend /news" {
    $r = Get-FrontendPage "/news"
    if ($r.StatusCode -ne 200) { throw "status=$($r.StatusCode)" }
}
Test-Step "Frontend /watchlist" {
    $r = Get-FrontendPage "/watchlist"
    if ($r.StatusCode -ne 200) { throw "status=$($r.StatusCode)" }
}

Test-Step "Frontend proxy chart history" {
    $r = Invoke-WebRequest "http://127.0.0.1:3000/api/v1/stocks/history?symbol=005930&market=korea&period=1w" -UseBasicParsing -TimeoutSec 45
    if ($r.StatusCode -ne 200) { throw "status=$($r.StatusCode)" }
}

Test-Step "DOCX /stocks/005930 -> quote redirect" {
    $r = Invoke-WebRequest "http://127.0.0.1:3000/stocks/005930" -UseBasicParsing -TimeoutSec 25 -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($r.StatusCode -notin 307, 308, 301, 302) {
        $r2 = Get-FrontendPage "/quote/korea/005930"
        if ($r2.StatusCode -ne 200) { throw "expected redirect or quote 200" }
    }
}

Test-Step "Frontend /charts?symbol=066570 (LG)" {
    $p = Get-FrontendPage "/charts?market=korea&symbol=066570"
    if ($p.StatusCode -ne 200) { throw "status=$($p.StatusCode)" }
}

Write-Host ""
if ($fail -eq 0) {
    Write-Host 'All checks passed.' -ForegroundColor Green
    exit 0
}
Write-Host ("{0} check(s) failed — run stop-dev.bat then start again." -f $fail) -ForegroundColor Yellow
exit 1

"""종목 로고 — 네이버(한국)·FMP(미국/폴백) 등 다중 소스 (서버 프록시용)."""

from __future__ import annotations

import asyncio
import re

import httpx

from app.data.intl_logo_map import intl_yahoo_logo_ticker
from app.data.korea_universe import KOREA_UNIVERSE
from app.data.us_logo_domains import us_logo_domain

_KOREA_YAHOO: dict[str, str] = {m["symbol"]: m["yahoo"] for m in KOREA_UNIVERSE}

# 국내 증권앱(네이버/토스 등)과 동일 계열 — 6자리 코드 기준
NAVER_KR_LOGO = "https://ssl.pstatic.net/imgstock/fn/real/logo/png/stock/Stock{code}.png"
FNGUIDE_KR = "https://comp.fnguide.com/Mobile/Common/Data/logo/KR/{code}.png"
FMP_STOCK = "https://financialmodelingprep.com/image-stock/{ticker}.png"
FINNHUB_LOGO = "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/{ticker}.png"
PARQET_LOGO = "https://assets.parqet.com/logos/symbol/{ticker}?format=png"
CLEARBIT_LOGO = "https://logo.clearbit.com/{domain}"

_US_TICKER = re.compile(r"^[A-Z0-9.-]{1,12}$")
_US_CLASS_SHARE = re.compile(r"^[A-Z0-9]{1,8}-[A-Z0-9]{1,3}$")

_HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}


def normalize_korea_code(symbol: str) -> str | None:
    raw = symbol.strip().upper().replace(".KS", "").replace(".KQ", "")
    digits = re.sub(r"\D", "", raw)
    return digits if len(digits) == 6 else None


def us_fmp_tickers(symbol: str) -> list[str]:
    """Yahoo/FMP 클래스주 표기 (BRK-B → BRK.B 우선)."""
    sym = symbol.strip().upper()
    if not sym:
        return []

    ordered: list[str] = []

    def add(ticker: str) -> None:
        if not ticker or not _US_TICKER.fullmatch(ticker):
            return
        if ticker not in ordered:
            ordered.append(ticker)

    if _US_CLASS_SHARE.fullmatch(sym):
        add(sym.replace("-", "."))
    add(sym)
    if "." in sym:
        add(sym.split(".", 1)[0])
    elif "-" in sym:
        add(sym.split("-", 1)[0])
    return ordered


def _dedupe_urls(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for url in urls:
        if url in seen:
            continue
        seen.add(url)
        out.append(url)
    return out


def _add_ticker(ordered: list[str], ticker: str) -> None:
    t = ticker.strip().upper()
    if not t or not _US_TICKER.fullmatch(t):
        return
    if t not in ordered:
        ordered.append(t)


def _us_logo_tickers(symbol: str) -> list[str]:
    """미국 티커 + 해외(Yahoo) 매핑 + 클래스주 변형."""
    sym = symbol.strip().upper()
    ordered: list[str] = []

    mapped = intl_yahoo_logo_ticker(sym)
    if mapped:
        _add_ticker(ordered, mapped)
    if "." in sym:
        _add_ticker(ordered, sym)
    for ticker in us_fmp_tickers(sym):
        _add_ticker(ordered, ticker)
    return ordered


def _urls_for_tickers(tickers: list[str], *, include_clearbit_for: str | None = None) -> list[str]:
    urls: list[str] = []
    for ticker in tickers:
        urls.append(FINNHUB_LOGO.format(ticker=ticker))
        urls.append(PARQET_LOGO.format(ticker=ticker))
        urls.append(FMP_STOCK.format(ticker=ticker))
    if include_clearbit_for:
        domain = us_logo_domain(include_clearbit_for)
        if domain:
            urls.append(CLEARBIT_LOGO.format(domain=domain))
    return urls


def _korea_fmp_suffixes(code: str) -> list[str]:
    yahoo = _KOREA_YAHOO.get(code)
    if not yahoo:
        return [f"{code}.KS", f"{code}.KQ"]
    suffixes = [yahoo]
    alt = f"{code}.KQ" if yahoo.endswith(".KS") else f"{code}.KS"
    if alt not in suffixes:
        suffixes.append(alt)
    return suffixes


def logo_candidate_urls(market: str, symbol: str) -> list[str]:
    market_key = market.strip().lower()
    sym = symbol.strip().upper()
    urls: list[str] = []

    if market_key == "korea":
        code = normalize_korea_code(sym)
        if not code:
            return []
        urls.append(NAVER_KR_LOGO.format(code=code))
        urls.append(FNGUIDE_KR.format(code=code))
        urls.extend(_urls_for_tickers(_korea_fmp_suffixes(code)))
        return _dedupe_urls(urls)

    if market_key == "us":
        tickers = _us_logo_tickers(sym)
        if not tickers:
            return []
        urls.extend(_urls_for_tickers(tickers, include_clearbit_for=sym))
        return _dedupe_urls(urls)

    return []


def _looks_like_image(content: bytes, content_type: str) -> bool:
    if len(content) < 120:
        return False
    ct = (content_type or "").lower()
    if "image" in ct and "svg" not in ct:
        return True
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return True
    if content[:3] == b"\xff\xd8\xff":
        return True
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return True
    return False


async def _fetch_logo_from_url(client: httpx.AsyncClient, url: str) -> tuple[bytes, str] | None:
    try:
        response = await client.get(url)
    except httpx.HTTPError:
        return None
    if response.status_code != 200:
        return None
    body = response.content
    ctype = response.headers.get("content-type", "")
    if not _looks_like_image(body, ctype):
        return None
    media = ctype.split(";", 1)[0].strip() or "image/png"
    return body, media


async def fetch_stock_logo(market: str, symbol: str) -> tuple[bytes, str]:
    urls = logo_candidate_urls(market, symbol)
    if not urls:
        raise ValueError("no logo candidates")

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=12.0,
        headers=_HTTP_HEADERS,
    ) as client:
        tasks = [asyncio.create_task(_fetch_logo_from_url(client, url)) for url in urls]
        try:
            for finished in asyncio.as_completed(tasks):
                result = await finished
                if result:
                    return result
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    raise ValueError("logo not found")

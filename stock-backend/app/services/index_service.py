import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import FinanceDataReader as fdr
import yfinance as yf

from app.services.stock_providers.yahoo_batch import _patch_from_ticker

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=6)

INDEX_MAP = {
    "kospi": {"yahoo": "^KS11", "name": "코스피지수", "country": "KR", "category": "indices"},
    "kospi200": {"yahoo": "^KS200", "name": "코스피200", "country": "KR", "category": "indices"},
    "kosdaq": {"yahoo": "^KQ11", "name": "코스닥", "country": "KR", "category": "indices"},
    "nasdaq": {"yahoo": "^IXIC", "name": "NASDAQ", "country": "US", "category": "indices"},
    "us-tech100": {"yahoo": "^NDX", "name": "US Tech 100", "country": "US", "category": "indices"},
    "sp500": {"yahoo": "^GSPC", "name": "US 500", "country": "US", "category": "indices"},
    "dow": {"yahoo": "^DJI", "name": "Dow Jones", "country": "US", "category": "indices"},
    "dax": {"yahoo": "^GDAXI", "name": "DAX", "country": "DE", "category": "indices"},
    "nikkei": {"yahoo": "^N225", "name": "닛케이", "country": "JP", "category": "indices"},
    "usd-krw": {"yahoo": "KRW=X", "name": "USD/KRW", "country": "FX", "category": "forex"},
    "usd-index": {
        "yahoo": "DX-Y.NYB",
        "name": "미국 달러 지수",
        "country": "FX",
        "category": "forex",
    },
    "eur-krw": {"yahoo": "EURKRW=X", "name": "EUR/KRW", "country": "FX", "category": "forex"},
    "jpy-krw": {"yahoo": "JPYKRW=X", "name": "JPY/KRW", "country": "FX", "category": "forex"},
    "gold": {"yahoo": "GC=F", "name": "금", "country": "CM", "category": "commodity"},
    "silver": {"yahoo": "SI=F", "name": "은", "country": "CM", "category": "commodity"},
    "platinum": {"yahoo": "PL=F", "name": "백금", "country": "CM", "category": "commodity"},
    "oil": {"yahoo": "CL=F", "name": "WTI 원유", "country": "CM", "category": "commodity"},
    "brent": {"yahoo": "BZ=F", "name": "브렌트유", "country": "CM", "category": "commodity"},
    "natural-gas": {"yahoo": "NG=F", "name": "천연가스", "country": "CM", "category": "commodity"},
    "copper": {"yahoo": "HG=F", "name": "구리", "country": "CM", "category": "commodity"},
    "wheat": {"yahoo": "ZW=F", "name": "밀", "country": "CM", "category": "commodity"},
    "corn": {"yahoo": "ZC=F", "name": "옥수수", "country": "CM", "category": "commodity"},
    "soybeans": {"yahoo": "ZS=F", "name": "대두", "country": "CM", "category": "commodity"},
    "sugar": {"yahoo": "SB=F", "name": "설탕", "country": "CM", "category": "commodity"},
    "cotton": {"yahoo": "CT=F", "name": "면", "country": "CM", "category": "commodity"},
}


def resolve_yahoo_ticker(index_id: str) -> str | None:
    meta = INDEX_MAP.get(index_id)
    return meta["yahoo"] if meta else None


# KRX 심볼(KS11/KS200/KQ11) 사용 — ^KS200(Yahoo)은 당일 1행만 와 등락이 0이 됨
FDR_INDEX_TICKER: dict[str, str] = {
    "kospi": "KS11",
    "kospi200": "KS200",
    "kosdaq": "KQ11",
    "nikkei": "N225",
}


def _fetch_index_fdr(index_id: str) -> dict | None:
    sym = FDR_INDEX_TICKER.get(index_id)
    meta = INDEX_MAP.get(index_id)
    if not sym or not meta:
        return None
    dec = 4 if "krw" in index_id or index_id.endswith("-krw") else 2
    try:
        end = datetime.now()
        start = end - timedelta(days=10)
        df = fdr.DataReader(sym, start, end)
        if df is None or df.empty or len(df) < 1:
            return None
        row = df.iloc[-1]
        price = float(row["Close"])
        if price <= 0:
            return None

        # KRX 포맷: Comp(등락폭), Change(등락률 소수)
        change: float
        change_percent: float
        if "Comp" in df.columns:
            try:
                change = float(row["Comp"])
            except (TypeError, ValueError):
                change = 0.0
            if "Change" in df.columns:
                try:
                    raw_pct = float(row["Change"])
                    # -0.0788 → -7.88, 이미 %면 그대로
                    change_percent = raw_pct * 100 if abs(raw_pct) < 1 else raw_pct
                except (TypeError, ValueError):
                    prev = price - change
                    change_percent = (change / prev * 100) if prev else 0.0
            else:
                prev = price - change
                change_percent = (change / prev * 100) if prev else 0.0
        else:
            prev = float(df.iloc[-2]["Close"]) if len(df) >= 2 else price
            change = price - prev
            change_percent = (change / prev * 100) if prev else 0.0

        return {
            "id": index_id,
            "name": meta["name"],
            "country": meta["country"],
            "category": meta.get("category", "indices"),
            "price": round(price, dec),
            "change": round(change, dec),
            "change_percent": round(change_percent, 2),
            "status": "live",
        }
    except Exception as exc:
        logger.debug("FDR index %s (%s): %s", index_id, sym, exc)
        return None


def _row_from_cache(index_id: str) -> dict | None:
    try:
        from app.services.market_data import market_data

        for row in market_data.get_indices() or []:
            if row.get("id") == index_id and float(row.get("price") or 0) > 0:
                meta = INDEX_MAP[index_id]
                dec = 4 if "krw" in index_id or index_id.endswith("-krw") else 2
                return {
                    "id": index_id,
                    "name": meta["name"],
                    "country": meta["country"],
                    "category": meta.get("category", "indices"),
                    "price": round(float(row["price"]), dec),
                    "change": round(float(row.get("change") or 0), dec),
                    "change_percent": round(
                        float(row.get("change_percent") or row.get("changePercent") or 0), 2
                    ),
                    "status": row.get("status") or "live",
                }
    except Exception:
        return None
    return None


def _static_index_row(index_id: str) -> dict:
    cached = _row_from_cache(index_id)
    if cached:
        return cached
    meta = INDEX_MAP[index_id]
    price, change, change_pct = _STATIC_INDEX_PRICE.get(index_id, (0.0, 0.0, 0.0))
    dec = 4 if "krw" in index_id or index_id.endswith("-krw") else 2
    return {
        "id": index_id,
        "name": meta["name"],
        "country": meta["country"],
        "category": meta.get("category", "indices"),
        "price": round(price, dec),
        "change": round(change, dec),
        "change_percent": round(change_pct, 2),
        "status": "stale",
    }


def _index_row(
    index_id: str,
    *,
    price: float,
    change: float,
    change_percent: float,
    status: str = "live",
) -> dict:
    meta = INDEX_MAP[index_id]
    dec = 4 if "krw" in index_id or index_id.endswith("-krw") else 2
    return {
        "id": index_id,
        "name": meta["name"],
        "country": meta["country"],
        "category": meta.get("category", "indices"),
        "price": round(price, dec),
        "change": round(change, dec),
        "change_percent": round(change_percent, 2),
        "status": status,
    }


def _apply_prev_close(price: float, prev: float, dec: int) -> tuple[float, float]:
    if price <= 0 or prev <= 0:
        return 0.0, 0.0
    change = price - prev
    change_percent = (change / prev * 100) if prev else 0.0
    return round(change, dec), round(change_percent, 2)


def _enrich_zero_change(row: dict) -> dict:
    """Yahoo 등이 전일종가 없이 change=0을 줄 때 FDR/캐시로 등락을 복구."""
    try:
        change = float(row.get("change") or 0)
        price = float(row.get("price") or 0)
    except (TypeError, ValueError):
        return row
    if abs(change) > 1e-9 or price <= 0:
        return row

    index_id = str(row.get("id") or "")
    dec = 4 if "krw" in index_id or index_id.endswith("-krw") else 2

    fdr_row = _fetch_index_fdr(index_id) if index_id in FDR_INDEX_TICKER else None
    if fdr_row:
        try:
            fdr_price = float(fdr_row.get("price") or 0)
            fdr_change = float(fdr_row.get("change") or 0)
            prev = fdr_price - fdr_change if fdr_price > 0 else 0.0
        except (TypeError, ValueError):
            prev = 0.0
        if abs(fdr_change) > 1e-9 and prev > 0:
            # 현재가가 Yahoo에만 있으면 가격은 유지하고 전일종가만 FDR에서 가져옴
            ch, pct = _apply_prev_close(price, prev, dec)
            if abs(ch) > 1e-9:
                return {**row, "change": ch, "change_percent": pct, "status": "live"}
            return fdr_row

    cached = _row_from_cache(index_id)
    if cached:
        try:
            cached_change = float(cached.get("change") or 0)
            cached_price = float(cached.get("price") or 0)
            prev = cached_price - cached_change if cached_price > 0 else 0.0
        except (TypeError, ValueError):
            prev = 0.0
        if abs(float(cached.get("change") or 0)) > 1e-9 and prev > 0:
            ch, pct = _apply_prev_close(price, prev, dec)
            if abs(ch) > 1e-9:
                return {
                    **row,
                    "change": ch,
                    "change_percent": pct,
                    "status": row.get("status") or "live",
                }

    return row


def _fetch_index(index_id: str) -> dict:
    meta = INDEX_MAP[index_id]
    dec = 4 if "krw" in index_id or index_id.endswith("-krw") else 2

    # 한국 지수: FDR 우선 (Yahoo ^KS200 전일종가 누락 → 등락 0% 버그·429 회피)
    if index_id in FDR_INDEX_TICKER:
        fdr_row = _fetch_index_fdr(index_id)
        if fdr_row and float(fdr_row.get("price") or 0) > 0:
            return _enrich_zero_change(fdr_row)

    try:
        yahoo = meta["yahoo"]
        ticker = yf.Ticker(yahoo)
        patch = _patch_from_ticker(ticker, index_id)
        if patch:
            row = _index_row(
                index_id,
                price=float(patch["price"]),
                change=float(patch["change"]),
                change_percent=float(patch["change_percent"]),
                status="live",
            )
            return _enrich_zero_change(row)
        info = ticker.info or {}
        hist = ticker.history(period="5d")
        price = float(
            info.get("regularMarketPrice")
            or info.get("currentPrice")
            or (hist["Close"].iloc[-1] if len(hist) else 0)
        )
        prev = float(
            info.get("regularMarketPreviousClose")
            or info.get("previousClose")
            or (hist["Close"].iloc[-2] if len(hist) >= 2 else 0)
        )
        if price <= 0 and len(hist):
            price = float(hist["Close"].iloc[-1])
        if prev <= 0 and len(hist) >= 2:
            prev = float(hist["Close"].iloc[-2])
        change, change_percent = _apply_prev_close(price, prev, dec)
        logger.debug("Index %s fallback to daily/info", index_id)
        row = _index_row(
            index_id,
            price=price,
            change=change,
            change_percent=change_percent,
            status="live",
        )
        return _enrich_zero_change(row)
    except Exception as exc:
        logger.warning("Index fetch failed for %s: %s", index_id, exc)
        fdr_row = _fetch_index_fdr(index_id)
        if fdr_row:
            return _enrich_zero_change(fdr_row)
        return _static_index_row(index_id)


# Yahoo 실패 시 API·WS가 빈 응답을 내지 않도록 (프론트 시드와 유사)
_STATIC_INDEX_PRICE: dict[str, tuple[float, float, float]] = {
    "kospi": (2680.0, 0.0, 0.0),
    "kospi200": (936.0, 0.0, 0.0),
    "kosdaq": (842.0, 0.0, 0.0),
    "nasdaq": (17850.0, 0.0, 0.0),
    "sp500": (5420.0, 0.0, 0.0),
    "dow": (39500.0, 0.0, 0.0),
    "us-tech100": (19500.0, 0.0, 0.0),
    "dax": (18000.0, 0.0, 0.0),
    "nikkei": (38000.0, 0.0, 0.0),
    "usd-krw": (1382.0, 0.0, 0.0),
    "usd-index": (101.8, 0.0, 0.0),
    "eur-krw": (1488.0, 0.0, 0.0),
    "jpy-krw": (9.12, 0.0, 0.0),
    "gold": (2654.0, 0.0, 0.0),
    "silver": (31.2, 0.0, 0.0),
    "platinum": (982.0, 0.0, 0.0),
    "oil": (68.4, 0.0, 0.0),
    "brent": (72.1, 0.0, 0.0),
    "natural-gas": (2.85, 0.0, 0.0),
    "copper": (4.52, 0.0, 0.0),
    "wheat": (5.42, 0.0, 0.0),
    "corn": (4.28, 0.0, 0.0),
    "soybeans": (10.15, 0.0, 0.0),
    "sugar": (19.8, 0.0, 0.0),
    "cotton": (72.5, 0.0, 0.0),
}


def static_indices(ids: list[str] | None = None, category: str | None = None) -> list[dict]:
    if category:
        target = [i for i, m in INDEX_MAP.items() if m.get("category") == category]
    elif ids:
        target = [i for i in ids if i in INDEX_MAP]
    else:
        target = list(INDEX_MAP.keys())
    return [_static_index_row(index_id) for index_id in target]


async def get_indices(ids: list[str] | None = None, category: str | None = None) -> list[dict]:
    if category:
        target = [i for i, m in INDEX_MAP.items() if m.get("category") == category]
    elif ids:
        target = [i for i in ids if i in INDEX_MAP]
    else:
        target = list(INDEX_MAP.keys())

    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(_executor, _fetch_index, i) for i in target]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for r in results:
        if isinstance(r, dict):
            out.append(r)
    return out


SECTOR_COUNTS = [
    {"id": "tech", "label": "기술", "count": 722},
    {"id": "finance", "label": "금융", "count": 186},
    {"id": "health", "label": "헬스케어", "count": 154},
    {"id": "industrial", "label": "산업재", "count": 212},
    {"id": "consumer", "label": "소비재", "count": 198},
    {"id": "energy", "label": "에너지", "count": 43},
    {"id": "utility", "label": "유틸리티", "count": 28},
    {"id": "realestate", "label": "부동산", "count": 36},
    {"id": "materials", "label": "소재", "count": 91},
    {"id": "telecom", "label": "통신", "count": 24},
]

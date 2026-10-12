import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

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


def _static_index_row(index_id: str) -> dict:
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
        "status": "live",
    }


def _fetch_index(index_id: str) -> dict:
    meta = INDEX_MAP[index_id]
    dec = 4 if "krw" in index_id or index_id.endswith("-krw") else 2
    try:
        yahoo = meta["yahoo"]
        ticker = yf.Ticker(yahoo)
        patch = _patch_from_ticker(ticker, index_id)
        if patch:
            return {
                "id": index_id,
                "name": meta["name"],
                "country": meta["country"],
                "category": meta.get("category", "indices"),
                "price": round(float(patch["price"]), dec),
                "change": round(float(patch["change"]), dec),
                "change_percent": round(float(patch["change_percent"]), 2),
                "status": "live",
            }
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
            or (hist["Close"].iloc[-2] if len(hist) >= 2 else price)
        )
        if price <= 0 and len(hist):
            price = float(hist["Close"].iloc[-1])
        change = price - prev if prev else 0.0
        change_percent = (change / prev * 100) if prev else 0.0
        logger.debug("Index %s fallback to daily/info", index_id)
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
        logger.warning("Index fetch failed for %s: %s", index_id, exc)
        return _static_index_row(index_id)


# Yahoo 실패 시 API·WS가 빈 응답을 내지 않도록 (프론트 시드와 유사)
_STATIC_INDEX_PRICE: dict[str, tuple[float, float, float]] = {
    "kospi": (2680.0, 0.0, 0.0),
    "kospi200": (360.0, 0.0, 0.0),
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


def static_indices(
    ids: list[str] | None = None, category: str | None = None
) -> list[dict]:
    if category:
        target = [i for i, m in INDEX_MAP.items() if m.get("category") == category]
    elif ids:
        target = [i for i in ids if i in INDEX_MAP]
    else:
        target = list(INDEX_MAP.keys())
    out: list[dict] = []
    for index_id in target:
        meta = INDEX_MAP[index_id]
        price, change, change_pct = _STATIC_INDEX_PRICE.get(index_id, (0.0, 0.0, 0.0))
        dec = 4 if "krw" in index_id or index_id.endswith("-krw") else 2
        out.append(
            {
                "id": index_id,
                "name": meta["name"],
                "country": meta["country"],
                "category": meta.get("category", "indices"),
                "price": round(price, dec),
                "change": round(change, dec),
                "change_percent": round(change_pct, 2),
                "status": "live",
            }
        )
    return out


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

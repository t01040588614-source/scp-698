"""Yahoo 429·오프라인 시 UI용 참고 시세 (실시간 아님)."""

from __future__ import annotations

from app.data.asia_universe import ASIA_UNIVERSE, IntlSymbolMeta
from app.data.europe_universe import EUROPE_UNIVERSE
from app.data.korea_universe import KOREA_UNIVERSE, KoreaSymbolMeta

# 대표 종목 참고가 (원). 나머지는 DEFAULT_KRW_PRICE 사용.
KOREA_REFERENCE_KRW: dict[str, float] = {
    "005930": 268_000,
    "000660": 192_000,
    "005380": 245_000,
    "005490": 410_000,
    "035420": 215_000,
    "035720": 48_000,
    "051910": 380_000,
    "006400": 380_000,
    "003550": 88_000,
    "068270": 190_000,
    "207940": 1_050_000,
    "000270": 98_000,
    "373220": 380_000,
    "105560": 78_000,
    "055550": 52_000,
    "035900": 78_000,
    "247540": 145_000,
    "086520": 92_000,
    "352820": 280_000,
    "323410": 28_000,
}

DEFAULT_KRW_PRICE = 50_000.0

US_SYMBOLS = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "GOOG",
    "AMZN",
    "NVDA",
    "META",
    "TSLA",
    "BRK-B",
    "JPM",
    "V",
    "UNH",
    "XOM",
    "JNJ",
    "WMT",
    "MA",
    "PG",
    "HD",
    "AVGO",
    "LLY",
    "COST",
    "MRK",
    "ABBV",
    "PEP",
    "KO",
    "AMD",
    "NFLX",
    "CRM",
    "ORCL",
    "ADBE",
    "INTC",
    "QCOM",
    "TXN",
    "BAC",
    "DIS",
    "CSCO",
]

US_REFERENCE_USD: dict[str, float] = {
    "AAPL": 225.0,
    "MSFT": 420.0,
    "GOOGL": 175.0,
    "GOOG": 175.0,
    "AMZN": 195.0,
    "NVDA": 125.0,
    "META": 580.0,
    "TSLA": 250.0,
    "AMD": 160.0,
    "NFLX": 700.0,
}

DEFAULT_USD_PRICE = 100.0

US_NAMES: dict[str, str] = {
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",
    "GOOG": "Alphabet Inc. (C)",
    "AMZN": "Amazon.com, Inc.",
    "NVDA": "NVIDIA Corporation",
    "META": "Meta Platforms, Inc.",
    "TSLA": "Tesla, Inc.",
    "BRK-B": "Berkshire Hathaway Inc.",
    "JPM": "JPMorgan Chase & Co.",
    "V": "Visa Inc.",
    "UNH": "UnitedHealth Group Incorporated",
    "XOM": "Exxon Mobil Corporation",
    "JNJ": "Johnson & Johnson",
    "WMT": "Walmart Inc.",
    "MA": "Mastercard Incorporated",
    "PG": "The Procter & Gamble Company",
    "HD": "The Home Depot, Inc.",
    "AVGO": "Broadcom Inc.",
    "LLY": "Eli Lilly and Company",
    "COST": "Costco Wholesale Corporation",
    "MRK": "Merck & Co., Inc.",
    "ABBV": "AbbVie Inc.",
    "PEP": "PepsiCo, Inc.",
    "KO": "The Coca-Cola Company",
    "AMD": "Advanced Micro Devices, Inc.",
    "NFLX": "Netflix, Inc.",
    "CRM": "Salesforce, Inc.",
    "ORCL": "Oracle Corporation",
    "ADBE": "Adobe Inc.",
    "INTC": "Intel Corporation",
    "QCOM": "QUALCOMM Incorporated",
    "TXN": "Texas Instruments Incorporated",
    "BAC": "Bank of America Corporation",
    "DIS": "The Walt Disney Company",
    "CSCO": "Cisco Systems, Inc.",
}


def _row_from_meta(
    meta: KoreaSymbolMeta | dict[str, str] | dict[str, object],
    price: float,
) -> dict:
    return {
        "symbol": meta["symbol"],
        "name": meta["name"],
        "market": meta["market"],
        "sector": meta.get("sector") or "",
        "price": round(price, 2),
        "change": 0.0,
        "change_percent": 0.0,
        "volume": 0,
        "market_cap": 0.0,
        "high": round(price, 2),
        "low": round(price, 2),
        "open": round(price, 2),
        "previous_close": round(price, 2),
        "pe_ratio": 0.0,
        "eps": 0.0,
        "data_source": "reference",
    }


def build_korea_seed_stocks() -> list[dict]:
    rows: list[dict] = []
    for meta in KOREA_UNIVERSE:
        price = KOREA_REFERENCE_KRW.get(meta["symbol"], DEFAULT_KRW_PRICE)
        rows.append(_row_from_meta(meta, price))
    return rows


def build_us_seed_stocks() -> list[dict]:
    rows: list[dict] = []
    for symbol in US_SYMBOLS:
        price = US_REFERENCE_USD.get(symbol, DEFAULT_USD_PRICE)
        meta = {
            "symbol": symbol,
            "name": US_NAMES.get(symbol, symbol),
            "market": "NASDAQ",
            "sector": "",
        }
        row = _row_from_meta(meta, price)
        row["exchange"] = "NASDAQ"
        row["currency"] = "USD"
        rows.append(row)
    return rows


def _intl_seed_from_universe(
    universe: list[IntlSymbolMeta], default_price: float = 100.0
) -> list[dict]:
    rows: list[dict] = []
    for meta in universe:
        meta_row = {
            "symbol": meta["symbol"],
            "name": meta["name"],
            "market": meta["exchange"],
            "sector": meta.get("sector") or "",
        }
        row = _row_from_meta(meta_row, default_price)
        row["exchange"] = meta["exchange"]
        row["currency"] = meta["currency"]
        rows.append(row)
    return rows


def build_asia_seed_stocks() -> list[dict]:
    return _intl_seed_from_universe(ASIA_UNIVERSE, 5000.0)


def build_europe_seed_stocks() -> list[dict]:
    return _intl_seed_from_universe(EUROPE_UNIVERSE, 120.0)

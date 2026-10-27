"""FinanceDataReader — KRX 일봉 기반 실시간에 가까운 시세."""

from __future__ import annotations

import asyncio
import math
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import FinanceDataReader as fdr

from app.data.korea_universe import KOREA_UNIVERSE, KoreaSymbolMeta
from app.data.stock_display_names import resolve_display_name
from app.services.krx_listing_cache import get_krx_fundamentals
from app.services.stock_providers.base import StockProvider


class KoreaFdrProvider(StockProvider):
    def __init__(self, max_workers: int = 6):
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._universe = KOREA_UNIVERSE
        self._meta_by_symbol = {m["symbol"]: m for m in self._universe}

    def _fetch_one(self, meta: KoreaSymbolMeta) -> dict | None:
        try:
            # FDR 인덱스는 tz-naive — aware datetime이면 비교 오류로 None 반환됨
            end = datetime.now()
            start = end - timedelta(days=10)
            df = fdr.DataReader(meta["symbol"], start, end)
            if df is None or df.empty:
                return None
            row = df.iloc[-1]
            prev = float(df.iloc[-2]["Close"]) if len(df) >= 2 else float(row["Close"])
            price = float(row["Close"])
            if price <= 0:
                return None
            change = price - prev
            change_percent = (change / prev * 100) if prev else 0.0
            volume = int(row.get("Volume", 0) or 0)
            fund = get_krx_fundamentals(meta["symbol"])
            market_cap = fund.market_cap if fund else 0.0
            if not math.isfinite(market_cap) or market_cap <= 0:
                market_cap = 0.0
            if market_cap <= 0 and fund and fund.shares > 0 and price > 0:
                market_cap = price * fund.shares
            return {
                "symbol": meta["symbol"],
                "name": resolve_display_name(
                    meta["symbol"],
                    stock_type="korea",
                    current=meta["name"],
                ),
                "market": meta["market"],
                "sector": meta.get("sector") or "",
                "price": round(price, 2),
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "volume": volume,
                "market_cap": round(market_cap, 2),
                "high": float(row.get("High", price) or price),
                "low": float(row.get("Low", price) or price),
                "open": float(row.get("Open", price) or price),
                "previous_close": round(prev, 2),
                "pe_ratio": 0.0,
                "eps": 0.0,
            }
        except Exception:
            return None

    async def get_stocks(self) -> list[dict]:
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(self._executor, self._fetch_one, meta) for meta in self._universe
        ]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]

    async def get_stock_detail(self, symbol: str) -> dict | None:
        meta: KoreaSymbolMeta | None = self._meta_by_symbol.get(symbol)
        if not meta:
            meta = {
                "symbol": symbol,
                "yahoo": f"{symbol}.KS",
                "name": symbol,
                "market": "KOSPI",
                "sector": "",
            }
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, self._fetch_one, meta)

    async def get_quotes(self, symbols: list[str]) -> dict[str, float]:
        target = [self._meta_by_symbol[s] for s in symbols if s in self._meta_by_symbol]
        loop = asyncio.get_event_loop()
        tasks = [loop.run_in_executor(self._executor, self._fetch_one, m) for m in target]
        results = await asyncio.gather(*tasks)
        return {r["symbol"]: r["price"] for r in results if r is not None}

    async def get_quote_patches(self, symbols: list[str]) -> dict[str, dict]:
        target = [self._meta_by_symbol[s] for s in symbols if s in self._meta_by_symbol]
        loop = asyncio.get_event_loop()
        tasks = [loop.run_in_executor(self._executor, self._fetch_one, m) for m in target]
        results = await asyncio.gather(*tasks)
        return {r["symbol"]: r for r in results if r is not None}

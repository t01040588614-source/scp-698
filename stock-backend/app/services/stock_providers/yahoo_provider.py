import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.data.seed_stocks import US_NAMES, US_SYMBOLS
from app.data.stock_display_names import resolve_display_name
from app.services.stock_providers.base import StockProvider
from app.services.stock_providers.yahoo_batch import fetch_us_symbols


class YahooFinanceProvider(StockProvider):
    """Yahoo Finance 미국주식 — 일괄 다운로드"""

    def __init__(self):
        self._symbols = list(US_SYMBOLS)
        self._executor = ThreadPoolExecutor(max_workers=2)

    def _patch_to_stock(self, sym: str, patch: dict) -> dict:
        return {
            "symbol": sym,
            "name": resolve_display_name(sym, stock_type="us", current=US_NAMES.get(sym)),
            "price": patch["price"],
            "change": patch["change"],
            "change_percent": patch["change_percent"],
            "volume": patch.get("volume", 0),
            "market_cap": patch.get("market_cap", 0) or 0,
            "high": patch.get("high", patch["price"]),
            "low": patch.get("low", patch["price"]),
            "open": patch.get("open", patch["price"]),
            "previous_close": patch.get("previous_close", patch["price"]),
            "exchange": "NASDAQ",
            "currency": "USD",
            "pe_ratio": patch.get("pe_ratio", 0) or 0.0,
            "eps": 0.0,
            "sector": "",
        }

    def _fetch_batch_sync(self, symbols: list[str] | None = None) -> list[dict]:
        target = [s.upper() for s in (symbols or self._symbols)]
        patches = fetch_us_symbols(target)
        return [self._patch_to_stock(sym, patch) for sym, patch in patches.items()]

    async def get_stocks(self) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, self._fetch_batch_sync, None)

    async def get_stock_detail(self, symbol: str) -> dict | None:
        rows = await self.get_quotes_full([symbol.upper()])
        return rows[0] if rows else None

    async def get_quotes_full(self, symbols: list[str]) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, self._fetch_batch_sync, symbols)

    async def get_quotes(self, symbols: list[str]) -> dict:
        rows = await self.get_quotes_full(symbols)
        return {r["symbol"]: r["price"] for r in rows}

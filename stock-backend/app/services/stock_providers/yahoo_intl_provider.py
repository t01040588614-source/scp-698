import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.data.asia_universe import IntlSymbolMeta
from app.services.stock_providers.base import StockProvider
from app.services.stock_providers.yahoo_batch import fetch_yahoo_batch


class YahooIntlProvider(StockProvider):
    """Yahoo Finance — 아시아·유럽 유니버스 일괄 조회"""

    def __init__(self, universe: list[IntlSymbolMeta], max_workers: int = 2):
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._universe = universe
        self._meta_by_symbol = {m["symbol"]: m for m in self._universe}

    def _build_yahoo_map(self, symbols: list[str] | None = None) -> dict[str, str]:
        metas = self._universe
        if symbols:
            sym_set = set(symbols)
            metas = [m for m in self._universe if m["symbol"] in sym_set]
        return {m["yahoo"]: m["symbol"] for m in metas}

    def _merge_meta(self, patch: dict) -> dict:
        meta = self._meta_by_symbol.get(patch["symbol"], {})
        return {
            "symbol": patch["symbol"],
            "name": meta.get("name") or patch["symbol"],
            "exchange": meta.get("exchange", ""),
            "currency": meta.get("currency", "USD"),
            "sector": meta.get("sector") or "",
            "price": patch["price"],
            "change": patch["change"],
            "change_percent": patch["change_percent"],
            "volume": patch.get("volume", 0),
            "market_cap": 0.0,
            "high": patch.get("high", patch["price"]),
            "low": patch.get("low", patch["price"]),
            "open": patch.get("open", patch["price"]),
            "previous_close": patch.get("previous_close", patch["price"]),
            "pe_ratio": 0.0,
            "eps": 0.0,
        }

    def _fetch_batch_sync(self, symbols: list[str] | None = None) -> list[dict]:
        ymap = self._build_yahoo_map(symbols)
        patches = fetch_yahoo_batch(ymap)
        return [self._merge_meta(p) for p in patches.values()]

    async def get_stocks(self) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, self._fetch_batch_sync, None)

    async def get_stock_detail(self, symbol: str) -> dict | None:
        rows = await self.get_quotes_full([symbol])
        return rows[0] if rows else None

    async def get_quotes_full(self, symbols: list[str]) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, self._fetch_batch_sync, symbols)

    async def get_quotes(self, symbols: list[str]) -> dict:
        rows = await self.get_quotes_full(symbols)
        return {r["symbol"]: r["price"] for r in rows}

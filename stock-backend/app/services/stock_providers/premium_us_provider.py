"""Alpha Vantage / Finnhub — 미국 시세 (키 있을 때)."""

from __future__ import annotations

import asyncio

from app.integrations import alpha_vantage_client, finnhub_client
from app.services.stock_providers.base import StockProvider
from app.services.stock_providers.yahoo_provider import YahooFinanceProvider


class PremiumUsProvider(StockProvider):
    """Finnhub 우선(빠름), 없으면 Alpha Vantage, 둘 다 없으면 빈 목록."""

    def __init__(self):
        self._yahoo = YahooFinanceProvider()
        self._names = self._yahoo._names  # noqa: SLF001

    def _to_stock(self, patch: dict) -> dict:
        sym = patch["symbol"]
        return {
            "symbol": sym,
            "name": self._names.get(sym, sym),
            "price": patch["price"],
            "change": patch["change"],
            "change_percent": patch["change_percent"],
            "volume": patch.get("volume", 0),
            "market_cap": 0,
            "high": patch.get("high", patch["price"]),
            "low": patch.get("low", patch["price"]),
            "open": patch.get("open", patch["price"]),
            "previous_close": patch.get("previous_close", patch["price"]),
            "exchange": "NASDAQ",
            "currency": "USD",
            "pe_ratio": 0.0,
            "eps": 0.0,
            "sector": "",
            "data_source": patch.get("data_source"),
        }

    async def _fetch_one(self, symbol: str) -> dict | None:
        if finnhub_client.is_configured():
            row = await finnhub_client.quote(symbol)
            if row:
                return self._to_stock(row)
        if alpha_vantage_client.is_configured():
            row = await alpha_vantage_client.global_quote(symbol)
            if row:
                return self._to_stock(row)
        return None

    async def get_stocks(self) -> list[dict]:
        if not finnhub_client.is_configured() and not alpha_vantage_client.is_configured():
            return []
        symbols = self._yahoo._symbols  # noqa: SLF001
        sem = asyncio.Semaphore(5)

        async def one(sym: str) -> dict | None:
            async with sem:
                return await self._fetch_one(sym)

        rows = await asyncio.gather(*(one(s) for s in symbols))
        return [r for r in rows if r]

    async def get_quotes_full(self, symbols: list[str]) -> list[dict]:
        rows = await asyncio.gather(*(self._fetch_one(s.upper()) for s in symbols))
        return [r for r in rows if r]

    async def get_stock_detail(self, symbol: str) -> dict | None:
        rows = await self.get_quotes_full([symbol])
        return rows[0] if rows else None

    async def get_quotes(self, symbols: list[str]) -> dict:
        rows = await self.get_quotes_full(symbols)
        return {r["symbol"]: r["price"] for r in rows}

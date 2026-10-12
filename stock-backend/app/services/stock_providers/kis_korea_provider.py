"""KIS Open API — 한국 시세 (키 설정 시)."""

from __future__ import annotations

from app.data.korea_universe import KOREA_UNIVERSE
from app.integrations import kis_client
from app.services.stock_providers.base import StockProvider


class KisKoreaProvider(StockProvider):
    def __init__(self):
        self._meta = {m["symbol"]: m for m in KOREA_UNIVERSE}

    def is_configured(self) -> bool:
        return kis_client.is_configured()

    def _merge(self, row: dict) -> dict:
        meta = self._meta.get(row["symbol"], {})
        return {
            **row,
            "name": meta.get("name") or row["symbol"],
            "market": meta.get("market", "KOSPI"),
            "sector": meta.get("sector") or "",
            "market_cap": 0,
            "type": "korea",
        }

    async def get_stocks(self) -> list[dict]:
        if not self.is_configured():
            return []
        symbols = [m["symbol"] for m in KOREA_UNIVERSE]
        rows = await kis_client.inquire_prices(symbols)
        return [self._merge(r) for r in rows]

    async def get_quote_patches(self, symbols: list[str]) -> dict[str, dict]:
        rows = await kis_client.inquire_prices(symbols)
        return {r["symbol"]: self._merge(r) for r in rows}

    async def get_quotes_full(self, symbols: list[str]) -> list[dict]:
        rows = await kis_client.inquire_prices(symbols)
        return [self._merge(r) for r in rows]

    async def get_stock_detail(self, symbol: str) -> dict | None:
        rows = await self.get_quotes_full([symbol])
        return rows[0] if rows else None

    async def get_quotes(self, symbols: list[str]) -> dict:
        rows = await self.get_quotes_full(symbols)
        return {r["symbol"]: r["price"] for r in rows}

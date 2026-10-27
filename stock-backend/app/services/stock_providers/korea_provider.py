import asyncio

from app.services.stock_providers.base import StockProvider

_FALLBACK = [
    {
        "symbol": "005930",
        "name": "삼성전자",
        "price": 71500,
        "change": 0,
        "change_percent": 0.0,
        "volume": 0,
        "market": "KOSPI",
        "type": "korea",
    },
]


def _row_to_legacy(stock: dict) -> dict:
    return {
        "symbol": stock.get("symbol", ""),
        "name": stock.get("name", ""),
        "price": float(stock.get("price") or 0),
        "change": float(stock.get("change") or 0),
        "change_percent": float(stock.get("change_percent") or 0),
        "volume": int(stock.get("volume") or 0),
        "market": stock.get("market") or "KOSPI",
        "high": float(stock.get("high") or stock.get("price") or 0),
        "low": float(stock.get("low") or stock.get("price") or 0),
        "open": float(stock.get("open") or stock.get("price") or 0),
        "previous_close": float(stock.get("previous_close") or stock.get("price") or 0),
        "market_cap": float(stock.get("market_cap") or 0),
    }


class KoreaStockProvider(StockProvider):
    """한국주식 — market_data 캐시(FDR/Yahoo/KIS) 우선, 비어 있으면 최소 폴백."""

    @staticmethod
    def _market_data():
        from app.services.market_data import market_data

        return market_data

    async def get_stocks(self) -> list[dict]:
        await asyncio.sleep(0)
        rows = self._market_data().get_by_type("korea")
        if rows:
            return [_row_to_legacy(s) for s in rows]
        return [_row_to_legacy(s) for s in _FALLBACK]

    async def get_stock_detail(self, symbol: str) -> dict | None:
        await asyncio.sleep(0)
        sym = symbol.strip().zfill(6)
        row = self._market_data().get_by_symbol(sym)
        if row and row.get("type") == "korea":
            return _row_to_legacy(row)
        for stock in await self.get_stocks():
            if stock["symbol"] == sym:
                return stock.copy()
        return None

    async def get_quotes(self, symbols: list[str]) -> dict:
        await asyncio.sleep(0)
        cached = self._market_data().get_cached_quotes(symbols)
        if cached:
            return cached
        out: dict[str, float] = {}
        for stock in await self.get_stocks():
            if not symbols or stock["symbol"] in symbols:
                out[stock["symbol"]] = float(stock["price"])
        return out


from sqlalchemy.ext.asyncio import AsyncSession

from app.services.market_data import market_data


class StockService:
    def __init__(self, db: AsyncSession | None = None):
        self.db = db

    async def get_korea_stocks(self) -> list[dict]:
        """한국주식 목록 (Yahoo fast_info 캐시 + 필요 시 갱신)"""
        market_data.ensure_fresh()
        return market_data.get_by_type("korea")

    async def get_us_stocks(self) -> list[dict]:
        """미국주식 목록 (Yahoo fast_info 캐시 + 필요 시 갱신)"""
        market_data.ensure_fresh()
        return market_data.get_by_type("us")

    async def get_asia_stocks(self) -> list[dict]:
        market_data.ensure_fresh()
        return market_data.get_by_type("asia")

    async def get_europe_stocks(self) -> list[dict]:
        market_data.ensure_fresh()
        return market_data.get_by_type("europe")

    async def get_korea_stock_detail(self, symbol: str) -> dict | None:
        market_data.ensure_fresh(max_age_sec=8)
        row = market_data.get_by_symbol(symbol)
        market_data.schedule_symbol_fresh(symbol)
        if row:
            return row
        from app.services.market_data import KOREA_SYMBOLS

        if symbol in KOREA_SYMBOLS:
            await market_data.refresh_symbols([symbol])
        return market_data.get_by_symbol(symbol)

    async def get_us_stock_detail(self, symbol: str) -> dict | None:
        sym = symbol.upper()
        market_data.ensure_fresh(max_age_sec=8)
        row = market_data.get_by_symbol(sym)
        market_data.schedule_symbol_fresh(sym)
        if not row:
            await market_data.refresh_symbols([sym])
            row = market_data.get_by_symbol(sym)
        return row

    async def search_stocks(self, query: str) -> list[dict]:
        """종목 검색"""
        query = query.lower()
        return [
            stock for stock in market_data.get_all()
            if query in stock["symbol"].lower() or query in stock["name"].lower()
        ]

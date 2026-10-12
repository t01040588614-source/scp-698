import asyncio
import random

from app.services.stock_providers.base import StockProvider


class KoreaStockProvider(StockProvider):
    """한국주식 제공자 (현재는 샘플 데이터 + KIS API 연동 구조)"""

    def __init__(self):
        self._stocks = [
            {
                "symbol": "005930",
                "name": "삼성전자",
                "price": 71500,
                "change": 1500,
                "change_percent": 2.14,
                "volume": 15234567,
                "market": "KOSPI",
                "high": 72200,
                "low": 70100,
                "open": 70500,
                "previous_close": 70000,
                "market_cap": 420_000_000_000_000,
            },
            {
                "symbol": "000660",
                "name": "SK 하이닉스",
                "price": 142000,
                "change": -3000,
                "change_percent": -2.07,
                "volume": 8234567,
                "market": "KOSPI",
                "high": 145500,
                "low": 141200,
                "open": 144800,
                "previous_close": 145000,
                "market_cap": 103_000_000_000_000,
            },
            {
                "symbol": "035420",
                "name": "NAVER",
                "price": 198500,
                "change": 4500,
                "change_percent": 2.32,
                "volume": 3234567,
                "market": "KOSPI",
                "high": 199800,
                "low": 194200,
                "open": 195000,
                "previous_close": 194000,
                "market_cap": 32_000_000_000_000,
            },
            {
                "symbol": "035720",
                "name": "카카오",
                "price": 52300,
                "change": -1200,
                "change_percent": -2.24,
                "volume": 5234567,
                "market": "KOSDAQ",
                "high": 53800,
                "low": 51900,
                "open": 53200,
                "previous_close": 53500,
                "market_cap": 23_000_000_000_000,
            },
            {
                "symbol": "051910",
                "name": "LG 화학",
                "price": 412000,
                "change": 8000,
                "change_percent": 1.98,
                "volume": 1234567,
                "market": "KOSPI",
                "high": 415000,
                "low": 403500,
                "open": 406000,
                "previous_close": 404000,
                "market_cap": 29_000_000_000_000,
            },
        ]

    async def get_stocks(self) -> list[dict]:
        # TODO: 한국투자증권 KIS API 연동 시 대체
        await asyncio.sleep(0.05)
        return [s.copy() for s in self._stocks]

    async def get_stock_detail(self, symbol: str) -> dict | None:
        stocks = await self.get_stocks()
        return next((s.copy() for s in stocks if s["symbol"] == symbol), None)

    async def get_quotes(self, symbols: list[str]) -> dict:
        """WebSocket용 실시간 시뮬레이션 (실제 API 연동 가능)"""
        result = {}
        for stock in self._stocks:
            if not symbols or stock["symbol"] in symbols:
                # 약간의 무작위 변동으로 실시간 느낌 연출
                variation = random.uniform(-0.002, 0.002)
                price = stock["price"] * (1 + variation)
                result[stock["symbol"]] = round(price, 0)
        return result

from abc import ABC, abstractmethod


class StockProvider(ABC):
    """주식 데이터 제공자 기본 인터페이스"""

    @abstractmethod
    async def get_stocks(self) -> list[dict]:
        """전체 주식 목록 조회"""

    @abstractmethod
    async def get_stock_detail(self, symbol: str) -> dict | None:
        """개별 종목 상세 조회"""

    @abstractmethod
    async def get_quotes(self, symbols: list[str]) -> dict:
        """실시간 시세 조회 (symbol -> price dict)"""


from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.market_data import market_data
from app.schemas.stock import (
    ChartEventsResponse,
    IntlStockResponse,
    KoreaStockResponse,
    PeriodReturnsResponse,
    StockHistoryResponse,
    USStockResponse,
)
from app.services.chart_events_service import chart_events_service
from app.services.chart_service import chart_service
from app.services.key_stats_service import key_stats_service
from app.services.stock_service import StockService

router = APIRouter()


@router.get("/korea", response_model=list[KoreaStockResponse])
async def get_korea_stocks():
    """한국주식 목록 조회 (시세 캐시 — DB 불필요)"""
    service = StockService()
    stocks = await service.get_korea_stocks()
    if not stocks:
        market_data._ensure_seed_cache()
        stocks = await service.get_korea_stocks()
    if not stocks:
        raise HTTPException(status_code=503, detail="시세 캐시를 준비 중입니다. 잠시 후 다시 시도해 주세요.")
    return stocks


@router.get("/korea/{symbol}", response_model=KoreaStockResponse)
async def get_korea_stock_detail(symbol: str):
    """한국주식 상세 조회"""
    service = StockService()
    stock = await service.get_korea_stock_detail(symbol)
    if not stock:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다")
    return stock


@router.get("/us", response_model=list[USStockResponse])
async def get_us_stocks():
    """미국주식 목록 조회"""
    service = StockService()
    stocks = await service.get_us_stocks()
    if not stocks:
        market_data._ensure_seed_cache()
        stocks = await service.get_us_stocks()
    if not stocks:
        raise HTTPException(status_code=503, detail="시세 캐시를 준비 중입니다. 잠시 후 다시 시도해 주세요.")
    return stocks


@router.get("/asia", response_model=list[IntlStockResponse])
async def get_asia_stocks():
    """아시아(한국 제외) 주요 종목"""
    service = StockService()
    stocks = await service.get_asia_stocks()
    if not stocks:
        market_data._ensure_seed_cache()
        stocks = await service.get_asia_stocks()
    if not stocks:
        raise HTTPException(status_code=503, detail="시세 캐시를 준비 중입니다. 잠시 후 다시 시도해 주세요.")
    return stocks


@router.get("/europe", response_model=list[IntlStockResponse])
async def get_europe_stocks():
    """유럽 주요 종목"""
    service = StockService()
    stocks = await service.get_europe_stocks()
    if not stocks:
        market_data._ensure_seed_cache()
        stocks = await service.get_europe_stocks()
    if not stocks:
        raise HTTPException(status_code=503, detail="시세 캐시를 준비 중입니다. 잠시 후 다시 시도해 주세요.")
    return stocks


@router.get("/us/{symbol}", response_model=USStockResponse)
async def get_us_stock_detail(symbol: str):
    """미국주식 상세 조회"""
    service = StockService()
    stock = await service.get_us_stock_detail(symbol)
    if not stock:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다")
    return stock


@router.get("/key-stats")
async def get_key_stats(
    symbol: str = Query(..., min_length=1),
    market: str = Query("korea", pattern="^(korea|us|index)$"),
):
    """차트 하단 Investing 스타일 주요 통계 (3열)"""
    return await key_stats_service.get_key_stats(symbol, market)


@router.get("/history/period-returns", response_model=PeriodReturnsResponse)
async def get_stock_period_returns(
    symbol: str = Query(..., min_length=1),
    market: str = Query("korea", pattern="^(korea|us|index)$"),
):
    """차트 하단 8개 기간 수익률 (1일·1주·…·최대) — 일괄 조회"""
    return await chart_service.get_period_returns(symbol, market)


@router.get("/history/chart-events", response_model=ChartEventsResponse)
async def get_stock_chart_events(
    symbol: str = Query(..., min_length=1),
    market: str = Query("korea", pattern="^(korea|us|index)$"),
    period: str = Query("6m", pattern="^(1d|1w|1m|3m|6m|1y|5y|max)$"),
):
    """차트 마커 — 배당(D) · 실적(E)"""
    return await chart_events_service.get_events(symbol, market, period)


@router.get("/history", response_model=StockHistoryResponse)
async def get_stock_history(
    symbol: str = Query(..., min_length=1),
    market: str = Query("korea", pattern="^(korea|us|index)$"),
    period: str = Query("1m", pattern="^(1d|1w|1m|3m|6m|1y|5y|max)$"),
    interval: str | None = Query(
        None,
        pattern="^(5m|15m|30m|1h|1d)$",
        description="1일·1주 뷰 분봉/일봉 간격",
    ),
):
    """종목 시계열 (Yahoo Finance, 실패 시 합성 시계열)"""
    return await chart_service.get_history(symbol, market, period, interval)


@router.get("/search", response_model=list[KoreaStockResponse | USStockResponse])
async def search_stocks(
    q: str = Query(..., min_length=1, description="검색어"),
    db: AsyncSession = Depends(get_db),
):
    """종목 검색"""
    service = StockService(db)
    return await service.search_stocks(q)

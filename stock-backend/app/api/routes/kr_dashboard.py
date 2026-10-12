"""DOCX 명세: 한국 종목 스크리너·상세·뉴스·컨센서스 API (/api/v1/kr)."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_optional_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.kr_dashboard import (
    KrConsensusOut,
    KrListStocksQuery,
    KrNewsItem,
    KrQuoteBar,
    KrStockDetailResponse,
    KrStockListResponse,
    ScreenerCreate,
    ScreenerOut,
)
from app.services.kr_dashboard_service import KrDashboardService

router = APIRouter(prefix="/kr", tags=["한국 스크리너"])


def get_kr_service(db: AsyncSession = Depends(get_db)) -> KrDashboardService:
    return KrDashboardService(db)


@router.get("/stocks", response_model=KrStockListResponse)
async def list_kr_stocks(
    query: str | None = None,
    market: str | None = None,
    sector: str | None = None,
    industry: str | None = None,
    market_cap_gte: float | None = Query(None, alias="marketCapGte"),
    market_cap_lte: float | None = Query(None, alias="marketCapLte"),
    per_gte: float | None = Query(None, alias="perGte"),
    per_lte: float | None = Query(None, alias="perLte"),
    pbr_gte: float | None = Query(None, alias="pbrGte"),
    pbr_lte: float | None = Query(None, alias="pbrLte"),
    dividend_yield_gte: float | None = Query(None, alias="dividendYieldGte"),
    sort_by: Literal["marketCap", "per", "pbr", "dividendYield", "name", "price"] = Query(
        "marketCap", alias="sortBy"
    ),
    sort_order: Literal["ASC", "DESC"] = Query("DESC", alias="sortOrder"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    service: KrDashboardService = Depends(get_kr_service),
):
    dto = KrListStocksQuery(
        query=query,
        market=market,
        sector=sector,
        industry=industry,
        marketCapGte=market_cap_gte,
        marketCapLte=market_cap_lte,
        perGte=per_gte,
        perLte=per_lte,
        pbrGte=pbr_gte,
        pbrLte=pbr_lte,
        dividendYieldGte=dividend_yield_gte,
        sortBy=sort_by,
        sortOrder=sort_order,
        limit=limit,
        offset=offset,
    )
    return await service.list_stocks(dto)


@router.get("/stocks/{code}", response_model=KrStockDetailResponse)
async def kr_stock_detail(code: str, service: KrDashboardService = Depends(get_kr_service)):
    detail = await service.get_detail(code)
    if not detail:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다")
    return detail


@router.get("/stocks/{code}/quotes", response_model=list[KrQuoteBar])
async def kr_stock_quotes(
    code: str,
    limit: int = Query(200, ge=1, le=1000),
    service: KrDashboardService = Depends(get_kr_service),
):
    return await service.get_quotes(code, limit)


@router.get("/stocks/{code}/news", response_model=list[KrNewsItem])
async def kr_stock_news(
    code: str,
    limit: int = Query(20, ge=1, le=100),
    service: KrDashboardService = Depends(get_kr_service),
):
    return await service.get_news(code, limit)


@router.get("/stocks/{code}/consensus", response_model=KrConsensusOut | None)
async def kr_stock_consensus(code: str, service: KrDashboardService = Depends(get_kr_service)):
    return await service.get_consensus(code)


@router.post("/screeners", response_model=ScreenerOut, status_code=201)
async def save_screener(
    body: ScreenerCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: KrDashboardService = Depends(get_kr_service),
):
    try:
        return await service.save_screener(body, current_user.id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/screeners", response_model=list[ScreenerOut])
async def list_screeners(
    created_by: str | None = Query(None, alias="createdBy"),
    service: KrDashboardService = Depends(get_kr_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    user_id = current_user.id if current_user else None
    if user_id is None and not created_by:
        return []
    return await service.list_screeners(created_by, user_id)


@router.delete("/screeners/{screener_id}")
async def delete_screener(
    screener_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    service: KrDashboardService = Depends(get_kr_service),
):
    ok = await service.delete_screener(screener_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="스크리너를 찾을 수 없습니다")
    return {"ok": True}

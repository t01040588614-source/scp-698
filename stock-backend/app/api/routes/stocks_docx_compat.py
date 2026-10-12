"""DOCX 명세 경로 — GET/POST /api/v1/stocks (한국 스크리너, /korea·/us 와 공존)."""

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

router = APIRouter(tags=["한국 스크리너 (DOCX 경로)"])


def get_kr_service(db: AsyncSession = Depends(get_db)) -> KrDashboardService:
    return KrDashboardService(db)


def _require_kr_code(code: str) -> None:
    if not code.isdigit() or len(code) != 6:
        raise HTTPException(status_code=404, detail="한국 종목 코드(6자리)만 지원합니다")


@router.get("/screeners", response_model=list[ScreenerOut])
async def docx_list_screeners(
    created_by: str | None = Query(None, alias="createdBy"),
    service: KrDashboardService = Depends(get_kr_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    user_id = current_user.id if current_user else None
    if user_id is None and not created_by:
        return []
    return await service.list_screeners(created_by, user_id)


@router.post("/screeners", response_model=ScreenerOut, status_code=201)
async def docx_save_screener(
    body: ScreenerCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: KrDashboardService = Depends(get_kr_service),
):
    try:
        return await service.save_screener(body, current_user.id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.delete("/screeners/{screener_id}")
async def docx_delete_screener(
    screener_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    service: KrDashboardService = Depends(get_kr_service),
):
    ok = await service.delete_screener(screener_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="스크리너를 찾을 수 없습니다")
    return {"ok": True}


@router.get("/{code}/quotes", response_model=list[KrQuoteBar])
async def docx_quotes(
    code: str,
    limit: int = Query(200, ge=1, le=1000),
    service: KrDashboardService = Depends(get_kr_service),
):
    _require_kr_code(code)
    return await service.get_quotes(code, limit)


@router.get("/{code}/news", response_model=list[KrNewsItem])
async def docx_news(
    code: str,
    limit: int = Query(20, ge=1, le=100),
    service: KrDashboardService = Depends(get_kr_service),
):
    _require_kr_code(code)
    return await service.get_news(code, limit)


@router.get("/{code}/consensus", response_model=KrConsensusOut | None)
async def docx_consensus(code: str, service: KrDashboardService = Depends(get_kr_service)):
    _require_kr_code(code)
    return await service.get_consensus(code)


@router.get("/{code}", response_model=KrStockDetailResponse)
async def docx_detail(code: str, service: KrDashboardService = Depends(get_kr_service)):
    _require_kr_code(code)
    detail = await service.get_detail(code)
    if not detail:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다")
    return detail


@router.get("", response_model=KrStockListResponse)
async def docx_list_stocks(
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

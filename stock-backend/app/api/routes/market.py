import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from app.services import index_service
from app.services.stock_logo_service import fetch_stock_logo
from app.services.exchange_calendar import export_holiday_dates_for_frontend
from app.services.market_data import market_data
from app.services.market_session import full_session_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["시장"])


class IndexQuote(BaseModel):
    id: str
    name: str
    country: str
    category: str = "indices"
    price: float
    change: float
    change_percent: float
    status: str = "live"


class SectorItem(BaseModel):
    id: str
    label: str
    count: int


def _filter_index_rows(
    rows: list[dict],
    id_list: list[str] | None,
    category: str | None,
) -> list[dict]:
    out = rows
    if id_list:
        allowed = set(id_list)
        out = [i for i in out if i.get("id") in allowed]
    if category:
        out = [i for i in out if i.get("category") == category]
    return out


def _merge_indices_cache(rows: list[dict], id_list: list[str] | None, category: str | None) -> None:
    if not rows:
        return
    if id_list or category:
        merged = {i["id"]: i for i in market_data.get_indices()}
        for row in rows:
            merged[row["id"]] = row
        market_data.replace_indices_cache(list(merged.values()))
    else:
        market_data.replace_indices_cache(rows)


@router.get("/indices", response_model=list[IndexQuote])
async def list_indices(
    ids: str | None = Query(None, description="쉼표 구분 id (kospi,kosdaq,...)"),
    category: str | None = Query(None, description="indices|forex|commodity"),
):
    id_list = [s.strip() for s in ids.split(",")] if ids else None
    market_data.ensure_fresh(max_age_sec=25)

    cached = _filter_index_rows(market_data.get_indices(), id_list, category)
    if cached:
        asyncio.create_task(_refresh_indices_background(id_list, category))
        return cached

    try:
        rows = await asyncio.wait_for(
            index_service.get_indices(id_list, category=category),
            timeout=12.0,
        )
        if rows:
            _merge_indices_cache(rows, id_list, category)
            return rows
    except Exception as exc:
        logger.warning("Index API fetch failed: %s", exc)

    fallback = index_service.static_indices(id_list, category=category)
    if fallback:
        _merge_indices_cache(fallback, id_list, category)
        return fallback

    raise HTTPException(
        status_code=503,
        detail="Index data temporarily unavailable. Start backend on port 8000.",
    )


async def _refresh_indices_background(
    id_list: list[str] | None, category: str | None
) -> None:
    try:
        rows = await index_service.get_indices(id_list, category=category)
        if rows:
            _merge_indices_cache(rows, id_list, category)
    except Exception as exc:
        logger.debug("Background index refresh skipped: %s", exc)


@router.get("/sectors", response_model=list[SectorItem])
async def list_sectors():
    return index_service.SECTOR_COUNTS


@router.get("/session")
async def market_session():
    """한국·미국 장 상태 (휴장 캘린더·조기 마감 반영)."""
    return full_session_response()


@router.get("/holidays")
async def market_holidays():
    """프론트 오프라인 fallback용 휴장일 목록 (KRX·NYSE CSV와 동기)."""
    return export_holiday_dates_for_frontend()


@router.get("/cache-status")
async def cache_status():
    """시세 캐시 상태 (Yahoo 실패·참고 시세 여부)"""
    from app.services.websocket_manager import ws_manager

    body = market_data.status()
    body.update(ws_manager.broadcast_status())
    return body


@router.post("/refresh")
async def trigger_refresh():
    """시세 캐시 갱신 요청 (백그라운드, 즉시 상태 반환)"""
    market_data.schedule_refresh()
    return market_data.status()


@router.get("/stock-logo/{market}/{symbol}")
async def stock_logo(market: str, symbol: str):
    """종목 로고 (FnGuide·FMP 등 다중 소스, 브라우저 핫링크 회피)."""
    if market not in ("korea", "us"):
        raise HTTPException(status_code=400, detail="market must be korea or us")
    try:
        data, media_type = await fetch_stock_logo(market, symbol)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("Stock logo fetch failed %s/%s: %s", market, symbol, exc)
        raise HTTPException(status_code=404, detail="logo not found") from exc
    return Response(
        content=data,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )

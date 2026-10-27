"""로그인 사용자 — 관심목록·가격 알림·FCM."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user_data import (
    FcmTokenBody,
    PriceAlertResponse,
    PriceAlertSyncBody,
    WatchlistEntryResponse,
    WatchlistSyncBody,
)
from app.services.user_data_service import UserDataService

router = APIRouter(prefix="/me", tags=["내 데이터"])


def _watchlist_rows(rows) -> list[WatchlistEntryResponse]:
    return [
        WatchlistEntryResponse(
            symbol=r.symbol,
            market=r.market,
            name=r.name,
            sort_order=r.sort_order,
        )
        for r in rows
    ]


def _alert_rows(rows) -> list[PriceAlertResponse]:
    out: list[PriceAlertResponse] = []
    for r in rows:
        triggered = r.triggered_at.isoformat() if r.triggered_at else None
        out.append(
            PriceAlertResponse(
                id=r.id,
                symbol=r.symbol,
                market=r.market,
                name=r.name,
                target_price=r.target_price,
                direction=r.direction,
                enabled=r.enabled,
                triggered_at=triggered,
            )
        )
    return out


@router.get("/watchlist", response_model=list[WatchlistEntryResponse])
async def get_my_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await UserDataService(db).list_watchlist(current_user.id)
    return _watchlist_rows(rows)


@router.put("/watchlist", response_model=list[WatchlistEntryResponse])
async def sync_my_watchlist(
    body: WatchlistSyncBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = [i.model_dump() for i in body.items]
    rows = await UserDataService(db).replace_watchlist(current_user.id, payload)
    return _watchlist_rows(rows)


@router.get("/price-alerts", response_model=list[PriceAlertResponse])
async def get_my_price_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await UserDataService(db).list_alerts(current_user.id)
    return _alert_rows(rows)


@router.put("/price-alerts", response_model=list[PriceAlertResponse])
async def sync_my_price_alerts(
    body: PriceAlertSyncBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = [a.model_dump() for a in body.alerts]
    rows = await UserDataService(db).replace_alerts(current_user.id, payload)
    return _alert_rows(rows)


@router.get("/fcm-devices")
async def list_fcm_device_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tokens = await UserDataService(db).list_fcm_tokens(current_user.id)
    return {"count": len(tokens)}


@router.put("/fcm-token")
async def register_fcm_token(
    body: FcmTokenBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await UserDataService(db).upsert_fcm_token(current_user.id, body.token)
    return {"ok": True}

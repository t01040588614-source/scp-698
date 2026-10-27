"""관심목록·가격 알림·FCM 디바이스."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_data import UserFcmDevice, UserPriceAlert, UserWatchlistItem


class UserDataService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_watchlist(self, user_id: int) -> list[UserWatchlistItem]:
        result = await self.db.execute(
            select(UserWatchlistItem)
            .where(UserWatchlistItem.user_id == user_id)
            .order_by(UserWatchlistItem.sort_order, UserWatchlistItem.id.desc())
        )
        return list(result.scalars().all())

    async def replace_watchlist(
        self, user_id: int, items: list[dict]
    ) -> list[UserWatchlistItem]:
        await self.db.execute(
            delete(UserWatchlistItem).where(UserWatchlistItem.user_id == user_id)
        )
        out: list[UserWatchlistItem] = []
        for i, raw in enumerate(items[:50]):
            sym = str(raw.get("symbol", "")).strip()
            market = str(raw.get("market", "")).strip().lower()
            if not sym or market not in ("korea", "us"):
                continue
            row = UserWatchlistItem(
                user_id=user_id,
                symbol=sym,
                market=market,
                name=str(raw.get("name") or sym)[:128],
                sort_order=i,
            )
            self.db.add(row)
            out.append(row)
        await self.db.flush()
        return out

    async def list_alerts(self, user_id: int) -> list[UserPriceAlert]:
        result = await self.db.execute(
            select(UserPriceAlert)
            .where(UserPriceAlert.user_id == user_id)
            .order_by(UserPriceAlert.id.desc())
        )
        return list(result.scalars().all())

    async def replace_alerts(
        self, user_id: int, alerts: list[dict]
    ) -> list[UserPriceAlert]:
        await self.db.execute(
            delete(UserPriceAlert).where(UserPriceAlert.user_id == user_id)
        )
        out: list[UserPriceAlert] = []
        for raw in alerts[:100]:
            sym = str(raw.get("symbol", "")).strip()
            market = str(raw.get("market", "")).strip().lower()
            direction = str(raw.get("direction", "above")).strip().lower()
            if direction not in ("above", "below"):
                direction = "above"
            try:
                target = float(raw.get("target_price") or raw.get("targetPrice") or 0)
            except (TypeError, ValueError):
                continue
            if not sym or market not in ("korea", "us") or target <= 0:
                continue
            triggered = raw.get("triggered_at") or raw.get("triggeredAt")
            triggered_dt = None
            if triggered:
                try:
                    triggered_dt = datetime.fromisoformat(str(triggered).replace("Z", "+00:00"))
                except ValueError:
                    triggered_dt = None
            row = UserPriceAlert(
                user_id=user_id,
                symbol=sym,
                market=market,
                name=str(raw.get("name") or sym)[:128],
                target_price=target,
                direction=direction,
                enabled=bool(raw.get("enabled", True)),
                triggered_at=triggered_dt,
            )
            self.db.add(row)
            out.append(row)
        await self.db.flush()
        return out

    async def upsert_fcm_token(self, user_id: int, token: str) -> None:
        token = token.strip()
        if not token:
            return
        result = await self.db.execute(
            select(UserFcmDevice).where(
                UserFcmDevice.user_id == user_id,
                UserFcmDevice.fcm_token == token,
            )
        )
        if result.scalar_one_or_none():
            return
        self.db.add(UserFcmDevice(user_id=user_id, fcm_token=token))

    async def list_fcm_tokens(self, user_id: int) -> list[str]:
        result = await self.db.execute(
            select(UserFcmDevice.fcm_token).where(UserFcmDevice.user_id == user_id)
        )
        return [r[0] for r in result.all()]

    async def list_active_alerts_all_users(self) -> list[UserPriceAlert]:
        result = await self.db.execute(
            select(UserPriceAlert).where(
                UserPriceAlert.enabled.is_(True),
                UserPriceAlert.triggered_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def mark_alert_triggered(self, alert_id: int) -> None:
        result = await self.db.execute(
            select(UserPriceAlert).where(UserPriceAlert.id == alert_id)
        )
        row = result.scalar_one_or_none()
        if row:
            row.enabled = False
            row.triggered_at = datetime.now(UTC)

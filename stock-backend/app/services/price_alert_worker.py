"""서버 측 가격 알림 — 캐시 시세 기준, FCM(키·디바이스 있을 때)."""

from __future__ import annotations

import asyncio
import logging

from app.db.session import async_session_maker
from app.integrations import fcm_client
from app.services.market_data import market_data
from app.services.user_data_service import UserDataService

logger = logging.getLogger(__name__)


def _price_for(symbol: str, market: str) -> float | None:
    row = market_data.get_by_symbol(symbol.strip())
    if not row:
        return None
    mtype = row.get("type") or ""
    if market == "korea" and mtype != "korea":
        return None
    if market == "us" and mtype != "us":
        return None
    try:
        p = float(row.get("price") or 0)
    except (TypeError, ValueError):
        return None
    return p if p > 0 else None


def _triggered(direction: str, target: float, price: float) -> bool:
    if direction == "above":
        return price >= target
    return price <= target


class PriceAlertWorker:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._stop.clear()
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                await self._tick()
            except Exception as exc:
                logger.debug("price alert tick: %s", exc)
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=30.0)
            except TimeoutError:
                pass

    async def _tick(self) -> None:
        async with async_session_maker() as session:
            svc = UserDataService(session)
            alerts = await svc.list_active_alerts_all_users()
            if not alerts:
                return
            for alert in alerts:
                price = _price_for(alert.symbol, alert.market)
                if price is None:
                    continue
                if not _triggered(alert.direction, alert.target_price, price):
                    continue
                await svc.mark_alert_triggered(alert.id)
                if not fcm_client.is_configured():
                    continue
                tokens = await svc.list_fcm_tokens(alert.user_id)
                title = f"{alert.name or alert.symbol} 가격 알림"
                body = (
                    f"목표 {'이상' if alert.direction == 'above' else '이하'} "
                    f"{alert.target_price:,.2f} — 현재 {price:,.2f}"
                )
                for tok in tokens:
                    try:
                        await fcm_client.send_test(tok, title, body)
                    except Exception as exc:
                        logger.debug("FCM alert skip: %s", exc)
            await session.commit()


price_alert_worker = PriceAlertWorker()

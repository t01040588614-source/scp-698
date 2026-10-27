"""KIS 계좌 스냅샷 — 사용자별 주기·수동 동기화."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.db.session import async_session_maker
from app.integrations import kis_client
from app.services.broker_credential_service import BrokerCredentialService

logger = logging.getLogger(__name__)

_cache: dict[int, dict[str, Any]] = {}


class KisPortfolioSyncWorker:
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
                await sync_all_configured_users()
            except Exception as exc:
                logger.debug("KIS portfolio sync tick: %s", exc)
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=900.0)
            except TimeoutError:
                pass

    def get_cached(self, user_id: int) -> dict | None:
        return _cache.get(user_id)


kis_portfolio_sync = KisPortfolioSyncWorker()


async def sync_user_kis(user_id: int) -> dict:
    async with async_session_maker() as session:
        row = await BrokerCredentialService(session).get_kis(user_id)
        if not row or not row.account_no:
            raise ValueError("KIS 계좌가 설정되지 않았습니다")
        use_mock = (row.use_mock or "").lower() in ("1", "true", "yes")
        snap = await kis_client.inquire_account_snapshot(
            row.app_key,
            row.app_secret,
            account_no=row.account_no,
            account_product_code=row.account_product_code or "01",
            use_mock=use_mock,
        )
        _cache[user_id] = snap
        return snap


async def sync_all_configured_users() -> int:
    from sqlalchemy import select

    from app.models.user_broker_credential import UserBrokerCredential

    count = 0
    async with async_session_maker() as session:
        result = await session.execute(
            select(UserBrokerCredential.user_id).where(
                UserBrokerCredential.integration_id == "kis_korea",
                UserBrokerCredential.account_no.isnot(None),
            )
        )
        user_ids = [r[0] for r in result.all()]
    for uid in user_ids:
        try:
            await sync_user_kis(uid)
            count += 1
        except Exception as exc:
            logger.debug("KIS sync user %s: %s", uid, exc)
    return count

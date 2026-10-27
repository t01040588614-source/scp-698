"""KIS HTS급 체결·호가 WS — 구독 우선순위·캐시·클라이언트 푸시."""

from __future__ import annotations

import asyncio
import logging

from app.integrations.kis_client import is_configured
from app.integrations.kis_ws_client import KisWebSocketClient
from app.services.kis_subscription_planner import (
    collect_watchlist_kr_symbols,
    collect_ws_kr_symbols,
    plan_kis_subscriptions,
)
from app.services.market_data import market_data
from app.services.market_session import is_korea_regular_session
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


class KisRealtimeService:
    def __init__(self) -> None:
        self._client = KisWebSocketClient()
        self._client.set_tick_handler(self._on_tick)
        self._sync_task: asyncio.Task | None = None

    def status(self) -> dict:
        base = self._client.status()
        base["enabled"] = is_configured()
        base["kr_session_open"] = is_korea_regular_session()
        return base

    async def start(self) -> None:
        if not is_configured():
            logger.info("KIS realtime skipped — keys not set")
            return
        self._sync_task = asyncio.create_task(self._subscription_sync_loop())
        await self._refresh_plans()

    async def stop(self) -> None:
        if self._sync_task:
            self._sync_task.cancel()
            try:
                await self._sync_task
            except asyncio.CancelledError:
                pass
            self._sync_task = None
        await self._client.stop()

    async def _refresh_plans(self) -> None:
        wl = await collect_watchlist_kr_symbols()
        ws = collect_ws_kr_symbols()
        plans = plan_kis_subscriptions(wl, ws)
        await self._client.update_plans(plans)

    async def _subscription_sync_loop(self) -> None:
        while True:
            try:
                if is_configured() and is_korea_regular_session():
                    await self._refresh_plans()
                else:
                    await self._client.stop()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.debug("KIS subscription sync: %s", exc)
            await asyncio.sleep(30.0)

    async def _on_tick(self, symbol: str, price: float, tr_id: str) -> None:
        market_data.apply_kis_tick(symbol, price)
        await ws_manager.broadcast(
            {
                "type": "kis_tick",
                "symbol": symbol,
                "price": price,
                "tr_id": tr_id,
                "source": "kis_hts_ws",
            }
        )


kis_realtime = KisRealtimeService()

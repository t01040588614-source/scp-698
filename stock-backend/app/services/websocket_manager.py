import asyncio
import logging
from dataclasses import dataclass, field

from fastapi import WebSocket

from app.services.market_data import market_data
from app.services.market_session import is_any_regular_session

logger = logging.getLogger(__name__)


@dataclass
class WSSubscription:
    symbols: set[str] = field(default_factory=set)
    index_ids: set[str] = field(default_factory=set)


class StockWebSocketManager:
    """주식·지수 실시간 WebSocket — 캐시 기반 1초 푸시 (Yahoo 직접 호출 없음)."""

    def __init__(self, broadcast_interval: float = 1.0):
        self.active_connections: dict[WebSocket, WSSubscription] = {}
        self.broadcast_interval = broadcast_interval
        self._running = False
        self._task: asyncio.Task | None = None
        self._loop_errors = 0

    def broadcast_status(self) -> dict:
        task = self._task
        alive = self._running and task is not None and not task.done()
        return {
            "ws_broadcast_alive": alive,
            "ws_connections": len(self.active_connections),
            "ws_loop_errors": self._loop_errors,
        }

    def ensure_broadcast_loop(self) -> None:
        """브로드캐스트 태스크가 죽었으면 재기동 (장시간 실행 서버 복구)."""
        task = self._task
        if self._running and task is not None and not task.done():
            return
        if task is not None and task.done():
            reason = "cancelled" if task.cancelled() else task.exception() or "finished"
            logger.warning("WS broadcast loop stopped (%s); restarting", reason)
            self._running = False
            self._task = None
        if not self._running:
            asyncio.create_task(self.start_broadcast_loop())

    async def connect(self, websocket: WebSocket, symbols: list[str] | None = None):
        self.ensure_broadcast_loop()
        await websocket.accept()
        self.active_connections[websocket] = WSSubscription(
            symbols=set(symbols) if symbols else set()
        )

    def disconnect(self, websocket: WebSocket):
        self.active_connections.pop(websocket, None)

    def update_subscriptions(
        self,
        websocket: WebSocket,
        symbols: list[str] | None = None,
        index_ids: list[str] | None = None,
    ):
        sub = self.active_connections.get(websocket)
        if not sub:
            sub = WSSubscription()
            self.active_connections[websocket] = sub
        if symbols is not None:
            sub.symbols = set(symbols)
        if index_ids is not None:
            sub.index_ids = set(index_ids)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in list(self.active_connections.keys()):
            try:
                await connection.send_json(message)
            except Exception as exc:
                logger.debug("WS send failed, dropping client: %s", exc)
                disconnected.append(connection)
        for connection in disconnected:
            self.disconnect(connection)

    async def start_broadcast_loop(self):
        task = self._task
        if self._running and task is not None and not task.done():
            return
        self._running = True
        self._task = asyncio.create_task(self._broadcast_loop())

    async def stop_broadcast_loop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _broadcast_loop(self):
        from app.services.index_service import static_indices

        while self._running:
            try:
                if self.active_connections:
                    all_symbols: set[str] = set()
                    all_index_ids: set[str] = set()
                    for sub in self.active_connections.values():
                        all_symbols.update(sub.symbols)
                        all_index_ids.update(sub.index_ids)

                    market_data.set_subscribed_symbols(all_symbols)

                    age = market_data.cache_age_seconds()
                    threshold = getattr(market_data, "_stale_push_sec", 8)
                    gap = 0.5 if is_any_regular_session() else 3.0
                    if all_symbols:
                        market_data.schedule_refresh_symbols_debounced(
                            list(all_symbols), min_gap=gap
                        )
                    if is_any_regular_session():
                        if age is None or age > threshold:
                            market_data.schedule_refresh(min_gap=2.0)
                    elif age is None or age > threshold:
                        market_data.schedule_refresh()

                    ts = (
                        market_data.last_updated().isoformat()
                        if market_data.last_updated()
                        else None
                    )

                    push_syms = sorted(all_symbols) if all_symbols else []
                    if push_syms:
                        quotes = market_data.get_cached_quotes(push_syms)
                        ticks = market_data.get_cached_ticks(push_syms)
                        if quotes:
                            await self.broadcast(
                                {
                                    "type": "quotes",
                                    "data": quotes,
                                    "timestamp": ts,
                                    "scope": "subscribed",
                                }
                            )
                        if ticks:
                            await self.broadcast(
                                {
                                    "type": "ticks",
                                    "data": ticks,
                                    "timestamp": ts,
                                    "scope": "subscribed",
                                }
                            )

                    try:
                        cached = market_data.get_indices()
                        if all_index_ids:
                            payload = [
                                i for i in cached if i.get("id") in all_index_ids
                            ]
                            if not payload or len(payload) < len(all_index_ids):
                                market_data.schedule_index_refresh()
                                if not payload:
                                    payload = static_indices(list(all_index_ids))
                        else:
                            payload = cached
                        if payload:
                            await self.broadcast(
                                {
                                    "type": "indices",
                                    "data": payload,
                                    "timestamp": ts,
                                }
                            )
                    except Exception as exc:
                        logger.warning("WS indices broadcast failed: %s", exc)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self._loop_errors += 1
                logger.exception("WS broadcast loop iteration failed: %s", exc)

            await asyncio.sleep(self.broadcast_interval)


ws_manager = StockWebSocketManager(broadcast_interval=1.0)

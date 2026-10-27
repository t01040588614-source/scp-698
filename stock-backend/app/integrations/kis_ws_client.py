"""KIS Open API WebSocket — H0STCNT0 실시간 체결가."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

import httpx
import websockets

from app.integrations.key_store import get_key
from app.integrations.kis_client import is_configured

logger = logging.getLogger(__name__)

_MAX_SUBSCRIPTIONS = 40
_H0STCNT0_FIELD_COUNT = 46
_MAX_BACKOFF_SEC = 60.0
_TICK_HANDLER = Callable[[str, float, str], Awaitable[None]]


def _ws_url() -> str:
    mock = get_key("KIS_USE_MOCK").lower() in ("1", "true", "yes")
    return "ws://ops.koreainvestment.com:31000" if mock else "ws://ops.koreainvestment.com:21000"


def _rest_base() -> str:
    mock = get_key("KIS_USE_MOCK").lower() in ("1", "true", "yes")
    if mock:
        return "https://openapivts.koreainvestment.com:29443"
    return "https://openapi.koreainvestment.com:9443"


async def fetch_approval_key() -> str:
    app_key = get_key("KIS_APP_KEY")
    app_secret = get_key("KIS_APP_SECRET")
    if not app_key or not app_secret:
        raise RuntimeError("KIS keys not configured")
    url = f"{_rest_base()}/oauth2/Approval"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json={
                "grant_type": "client_credentials",
                "appkey": app_key,
                "appsecret": app_secret,
            },
            timeout=20.0,
        )
        resp.raise_for_status()
        data = resp.json()
    key = data.get("approval_key")
    if not key:
        raise RuntimeError(f"approval_key missing: {data}")
    return str(key)


def parse_h0stcnt0_body(body: str, data_cnt: int = 1) -> list[tuple[str, float]]:
    """H0STCNT0 본문 (^ 구분). data_cnt>1 이면 46필드 단위 레코드."""
    parts = body.split("^")
    out: list[tuple[str, float]] = []
    if data_cnt <= 1:
        parsed = _one_h0stcnt0_record(parts, 0)
        if parsed:
            out.append(parsed)
        return out
    for i in range(data_cnt):
        parsed = _one_h0stcnt0_record(parts, i * _H0STCNT0_FIELD_COUNT)
        if parsed:
            out.append(parsed)
    if not out and parts:
        parsed = _one_h0stcnt0_record(parts, 0)
        if parsed:
            out.append(parsed)
    return out


def _one_h0stasp0_record(parts: list[str], offset: int) -> tuple[str, float] | None:
    """H0STASP0 — 1호가 매도(ASKP1) 대표가."""
    if offset + 4 >= len(parts):
        return None
    sym = parts[offset].strip().zfill(6)
    try:
        price = float(parts[offset + 3])
    except (TypeError, ValueError):
        return None
    if price <= 0 or not sym:
        return None
    return sym, price


def _one_h0stcnt0_record(parts: list[str], offset: int) -> tuple[str, float] | None:
    if offset + 3 >= len(parts):
        return None
    sym = parts[offset].strip().zfill(6)
    try:
        price = float(parts[offset + 2])
    except (TypeError, ValueError):
        return None
    if price <= 0 or not sym:
        return None
    return sym, price


def parse_h0stcnt0_payload(payload: str) -> tuple[str, float] | None:
    rows = parse_h0stcnt0_body(payload, 1)
    return rows[0] if rows else None


def parse_pipe_message(raw: str) -> list[tuple[str, float, str]]:
    if not raw or raw[0] not in ("0", "1") or "|" not in raw:
        return []
    chunks = raw.split("|")
    if len(chunks) < 4:
        return []
    tr_id = chunks[1]
    if tr_id not in ("H0STCNT0", "H0STASP0"):
        return []
    try:
        data_cnt = max(1, int(chunks[2]))
    except (TypeError, ValueError):
        data_cnt = 1
    body = chunks[3]
    if tr_id == "H0STASP0":
        parts = body.split("^")
        row = _one_h0stasp0_record(parts, 0)
        return [(row[0], row[1], tr_id)] if row else []
    rows = parse_h0stcnt0_body(body, data_cnt)
    return [(sym, price, tr_id) for sym, price in rows]


def _subscribe_frame(
    approval_key: str, tr_id: str, symbol: str, tr_type: str = "1"
) -> str:
    sym = symbol.strip().zfill(6)
    body = {
        "header": {
            "approval_key": approval_key,
            "custtype": "P",
            "tr_type": tr_type,
            "content-type": "utf-8",
        },
        "body": {"input": {"tr_id": tr_id, "tr_key": sym}},
    }
    return json.dumps(body)


def _flatten_plans(plans: dict[str, set[str]]) -> set[tuple[str, str]]:
    out: set[tuple[str, str]] = set()
    count = 0
    for tr_id in ("H0STCNT0", "H0STASP0"):
        for sym in sorted(plans.get(tr_id, set())):
            if count >= _MAX_SUBSCRIPTIONS:
                return out
            s = sym.strip().zfill(6)
            if not s:
                continue
            out.add((tr_id, s))
            count += 1
    for tr_id, syms in plans.items():
        if tr_id in ("H0STCNT0", "H0STASP0"):
            continue
        for sym in sorted(syms):
            if count >= _MAX_SUBSCRIPTIONS:
                return out
            s = sym.strip().zfill(6)
            if s:
                out.add((tr_id, s))
                count += 1
    return out


class KisWebSocketClient:
    """단일 연결 · 구독 diff · 자동 재연결 (KIS 한도 41건)."""

    def __init__(self) -> None:
        self._desired: set[tuple[str, str]] = set()
        self._live: set[tuple[str, str]] = set()
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()
        self._connected = False
        self._last_tick_at: datetime | None = None
        self._last_error: str | None = None
        self._tick_count = 0
        self._reconnect_attempts = 0
        self._backoff_sec = 1.0
        self._on_tick: _TICK_HANDLER | None = None
        self._ws: Any = None
        self._approval_key: str | None = None
        self._send_lock = asyncio.Lock()

    def set_tick_handler(self, handler: _TICK_HANDLER | None) -> None:
        self._on_tick = handler

    def status(self) -> dict[str, Any]:
        return {
            "configured": is_configured(),
            "connected": self._connected,
            "desired_count": len(self._desired),
            "live_count": len(self._live),
            "subscribed_count": len(self._desired),
            "subscribed_symbols": [f"{t}:{s}" for t, s in sorted(self._desired)[:20]],
            "plans": {
                tr: sorted(s for t, s in self._desired if t == tr)[:15]
                for tr in ("H0STCNT0", "H0STASP0")
            },
            "last_tick_at": self._last_tick_at.isoformat() if self._last_tick_at else None,
            "tick_count": self._tick_count,
            "last_error": self._last_error,
            "reconnect_attempts": self._reconnect_attempts,
            "backoff_sec": self._backoff_sec,
            "ws_url": _ws_url() if is_configured() else None,
            "mode": "kis_hts_ws",
        }

    async def update_plans(self, plans: dict[str, set[str]]) -> None:
        desired = _flatten_plans(plans)
        if desired == self._desired:
            return
        self._desired = desired
        if not is_configured() or not self._desired:
            await self.stop()
            return
        if self._connected and self._ws and self._approval_key:
            await self._apply_subscription_diff()
            return
        await self.ensure_running()

    async def update_symbols(self, symbols: set[str]) -> None:
        syms = {s.strip().zfill(6) for s in symbols if s.strip()}
        await self.update_plans({"H0STCNT0": syms})

    async def set_symbols(self, symbols: set[str]) -> None:
        await self.update_symbols(symbols)

    async def ensure_running(self) -> None:
        if self._task and not self._task.done():
            return
        if not is_configured() or not self._desired:
            return
        self._stop.clear()
        self._task = asyncio.create_task(self._run())

    async def restart(self) -> None:
        await self.stop()
        if is_configured() and self._desired:
            await self.ensure_running()

    async def stop(self) -> None:
        self._stop.set()
        self._connected = False
        self._live.clear()
        ws = self._ws
        self._ws = None
        if ws is not None:
            try:
                await ws.close()
            except Exception:
                pass
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _apply_subscription_diff(self, *, force_all: bool = False) -> None:
        ws = self._ws
        key = self._approval_key
        if not ws or not key:
            return
        if force_all:
            to_remove = set(self._live)
            to_add = set(self._desired)
        else:
            to_remove = self._live - self._desired
            to_add = self._desired - self._live
        async with self._send_lock:
            for key_sub in sorted(to_remove):
                tr_id, sym = key_sub
                try:
                    await ws.send(_subscribe_frame(key, tr_id, sym, "2"))
                    self._live.discard(key_sub)
                    await asyncio.sleep(0.03)
                except Exception as exc:
                    logger.debug("KIS unsubscribe %s: %s", key_sub, exc)
                    raise
            for key_sub in sorted(to_add):
                tr_id, sym = key_sub
                try:
                    await ws.send(_subscribe_frame(key, tr_id, sym, "1"))
                    self._live.add(key_sub)
                    await asyncio.sleep(0.05)
                except Exception as exc:
                    logger.debug("KIS subscribe %s: %s", key_sub, exc)
                    raise

    async def _run(self) -> None:
        while not self._stop.is_set():
            if not self._desired:
                await asyncio.sleep(1.0)
                continue
            try:
                await self._session()
                self._backoff_sec = 1.0
                self._reconnect_attempts = 0
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self._reconnect_attempts += 1
                self._last_error = str(exc)
                self._connected = False
                self._live.clear()
                self._ws = None
                logger.warning("KIS WS session ended: %s", exc)
            if self._stop.is_set():
                break
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self._backoff_sec)
            except TimeoutError:
                pass
            self._backoff_sec = min(_MAX_BACKOFF_SEC, self._backoff_sec * 2)

    async def _session(self) -> None:
        if not is_configured() or not self._desired:
            return
        self._approval_key = await fetch_approval_key()
        url = _ws_url()
        async with websockets.connect(url, ping_interval=30, ping_timeout=30) as ws:
            self._ws = ws
            self._connected = True
            self._last_error = None
            self._live = set()
            await self._apply_subscription_diff(force_all=True)
            while not self._stop.is_set():
                raw = await asyncio.wait_for(ws.recv(), timeout=90.0)
                if not isinstance(raw, str):
                    continue
                ticks = parse_pipe_message(raw)
                for sym, price, tr_id in ticks:
                    self._last_tick_at = datetime.now(UTC)
                    self._tick_count += 1
                    if self._on_tick:
                        await self._on_tick(sym, price, tr_id)
                if not ticks and raw and raw[0] not in ("0", "1"):
                    try:
                        msg = json.loads(raw)
                        rt = msg.get("body", {}).get("rt_cd")
                        if rt is not None and str(rt) not in ("0", "OK"):
                            logger.debug("KIS WS ctrl: %s", msg)
                    except json.JSONDecodeError:
                        pass
                if self._desired != self._live:
                    await self._apply_subscription_diff()

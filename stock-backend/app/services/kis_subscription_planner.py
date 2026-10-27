"""KIS WS 구독 우선순위 — 관심(DB) > WS > 기본."""

from __future__ import annotations

import re

from sqlalchemy import select

from app.db.session import async_session_maker
from app.models.user_data import UserWatchlistItem
from app.services.websocket_manager import ws_manager

_DEFAULT = ["005930", "000660"]
_KR_CODE = re.compile(r"^\d{6}$")
_MAX_TOTAL = 40
_MAX_ASK = 10


def _is_kr_symbol(raw: str) -> bool:
    s = raw.strip().zfill(6)
    return bool(_KR_CODE.match(s))


async def collect_watchlist_kr_symbols() -> list[str]:
    async with async_session_maker() as session:
        result = await session.execute(
            select(UserWatchlistItem.symbol)
            .where(UserWatchlistItem.market == "korea")
            .distinct()
        )
        rows = [r[0].strip().zfill(6) for r in result.all() if r[0]]
    seen: set[str] = set()
    out: list[str] = []
    for sym in rows:
        if sym in seen:
            continue
        seen.add(sym)
        out.append(sym)
    return out


def collect_ws_kr_symbols() -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for sub in ws_manager.active_connections.values():
        for s in sub.symbols:
            if not _is_kr_symbol(s):
                continue
            sym = s.strip().zfill(6)
            if sym in seen:
                continue
            seen.add(sym)
            out.append(sym)
    return out


def plan_kis_subscriptions(
    watchlist: list[str],
    ws_symbols: list[str],
    *,
    defaults: list[str] | None = None,
) -> dict[str, set[str]]:
    """H0STCNT0 체결 + 상위 관심 H0STASP0 호가."""
    defaults = defaults or _DEFAULT
    ordered: list[str] = []
    seen: set[str] = set()

    def add_many(items: list[str]) -> None:
        for sym in items:
            s = sym.strip().zfill(6)
            if s in seen:
                continue
            seen.add(s)
            ordered.append(s)

    add_many(watchlist)
    add_many(ws_symbols)
    add_many(defaults)

    trade = ordered[:_MAX_TOTAL]
    ask = trade[:_MAX_ASK]
    return {
        "H0STCNT0": set(trade),
        "H0STASP0": set(ask),
    }

"""Finnhub quote & economic calendar API."""

from __future__ import annotations

import logging
from datetime import date

import httpx

from app.integrations.key_store import get_key

logger = logging.getLogger(__name__)

_BASE = "https://finnhub.io/api/v1"


def is_configured() -> bool:
    return bool(get_key("FINNHUB_API_KEY"))


def _token() -> str | None:
    t = get_key("FINNHUB_API_KEY")
    return t or None


async def quote(symbol: str) -> dict | None:
    token = _token()
    if not token:
        return None
    sym = symbol.upper()
    url = f"{_BASE}/quote"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params={"symbol": sym, "token": token}, timeout=15.0)
        if resp.status_code != 200:
            return None
        data = resp.json()
    try:
        price = float(data.get("c") or 0)
        prev = float(data.get("pc") or price)
        change = price - prev
        change_percent = (change / prev * 100) if prev else 0.0
        high = float(data.get("h") or price)
        low = float(data.get("l") or price)
        open_p = float(data.get("o") or price)
    except (TypeError, ValueError):
        return None
    if price <= 0:
        return None
    return {
        "symbol": sym,
        "price": price,
        "change": change,
        "change_percent": change_percent,
        "volume": 0,
        "high": high,
        "low": low,
        "open": open_p,
        "previous_close": prev,
        "data_source": "finnhub",
    }


async def economic_calendar(from_date: date, to_date: date) -> list[dict]:
    """Finnhub economic calendar (API 키 필요)."""
    token = _token()
    if not token:
        return []
    url = f"{_BASE}/calendar/economic"
    params = {
        "from": from_date.isoformat(),
        "to": to_date.isoformat(),
        "token": token,
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=25.0)
            if resp.status_code != 200:
                logger.debug("Finnhub calendar HTTP %s", resp.status_code)
                return []
            data = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Finnhub calendar fetch failed: %s", exc)
        return []

    rows = data.get("economicCalendar") or data.get("data") or []
    if not isinstance(rows, list):
        return []
    return [r for r in rows if isinstance(r, dict)]

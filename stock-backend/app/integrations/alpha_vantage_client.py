"""Alpha Vantage GLOBAL_QUOTE."""

from __future__ import annotations

import logging

import httpx

from app.integrations.key_store import get_key

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(get_key("ALPHA_VANTAGE_API_KEY"))


async def global_quote(symbol: str) -> dict | None:
    api_key = get_key("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        return None
    sym = symbol.upper()
    url = "https://www.alphavantage.co/query"
    params = {"function": "GLOBAL_QUOTE", "symbol": sym, "apikey": api_key}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=20.0)
        resp.raise_for_status()
        data = resp.json()
    q = data.get("Global Quote") or {}
    if not q:
        logger.debug("Alpha Vantage empty quote for %s: %s", sym, data.get("Note"))
        return None
    try:
        price = float(q.get("05. price") or 0)
        change = float(q.get("09. change") or 0)
        change_percent = float(str(q.get("10. change percent") or "0").replace("%", ""))
        volume = int(float(q.get("06. volume") or 0))
        prev = float(q.get("08. previous close") or price - change)
    except (TypeError, ValueError):
        return None
    if price <= 0:
        return None
    return {
        "symbol": sym,
        "price": price,
        "change": change,
        "change_percent": change_percent,
        "volume": volume,
        "high": price,
        "low": price,
        "open": price,
        "previous_close": prev,
        "data_source": "alpha_vantage",
    }

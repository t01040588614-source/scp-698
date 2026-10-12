"""표시용 심볼 → Yahoo/FMP 로고 티커 (아시아·유럽)."""

from __future__ import annotations

from app.data.asia_universe import ASIA_UNIVERSE
from app.data.europe_universe import EUROPE_UNIVERSE

INTL_YAHOO_BY_SYMBOL: dict[str, str] = {
    m["symbol"].upper(): m["yahoo"] for m in (*ASIA_UNIVERSE, *EUROPE_UNIVERSE)
}


def intl_yahoo_logo_ticker(symbol: str) -> str | None:
    sym = symbol.strip().upper()
    if not sym:
        return None
    return INTL_YAHOO_BY_SYMBOL.get(sym)

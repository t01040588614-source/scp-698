"""Deprecated shim — use app.services.market_session."""

from app.services.market_session import (  # noqa: F401
    get_korea_market_session,
    get_us_market_session,
    korea_session,
    us_session,
)

"""라우트 서브모듈 — main.py 에서 `from app.api.routes import auth` 형태로 로드."""

from . import (
    accounts,
    auth,
    chat,
    content,
    health,
    integrations,
    kr_dashboard,
    market,
    oauth_social,
    portfolio,
    stocks,
    stocks_docx_compat,
    ws,
)

__all__ = [
    "accounts",
    "auth",
    "chat",
    "content",
    "health",
    "integrations",
    "kr_dashboard",
    "market",
    "oauth_social",
    "portfolio",
    "stocks",
    "stocks_docx_compat",
    "ws",
]

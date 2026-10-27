"""라우트 서브모듈 — main.py 에서 `from app.api.routes import auth` 형태로 로드."""

from . import (
    accounts,
    auth,
    chat,
    config_public,
    content,
    health,
    integrations,
    kr_dashboard,
    market,
    me_data,
    oauth_social,
    portfolio,
    stocks,
    stocks_docx_compat,
    tools,
    ws,
)

__all__ = [
    "accounts",
    "auth",
    "chat",
    "config_public",
    "content",
    "health",
    "integrations",
    "kr_dashboard",
    "market",
    "me_data",
    "oauth_social",
    "portfolio",
    "stocks",
    "stocks_docx_compat",
    "tools",
    "ws",
]

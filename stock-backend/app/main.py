import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
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
from app.core.config import settings
from app.db.session import close_db, init_db
from app.services.kis_portfolio_sync import kis_portfolio_sync
from app.services.kis_realtime_service import kis_realtime
from app.services.market_data import market_data
from app.services.price_alert_worker import price_alert_worker
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

_NOISY_LOGGERS = (
    "aiosqlite",
    "peewee",
    "urllib3",
    "yfinance",
    "charset_normalizer",
    "httpcore",
    "httpx",
    "sqlalchemy.engine",
)


def _configure_logging() -> None:
    level = logging.DEBUG if settings.DEBUG else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s %(name)s: %(message)s")
    for name in _NOISY_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _configure_logging()
    try:
        await init_db()
        from app.db.session import async_session_maker
        from app.services.kr_dashboard_service import seed_kr_analytics

        async with async_session_maker() as session:
            await seed_kr_analytics(session)
    except Exception as exc:
        logger.warning("DB init skipped (시세 API는 계속 동작): %s", exc)

    try:
        await market_data.start_refresh_loop()
    except Exception as exc:
        logger.exception("Market data loop start failed: %s", exc)

    await ws_manager.start_broadcast_loop()
    await price_alert_worker.start()
    await kis_realtime.start()
    await kis_portfolio_sync.start()
    yield
    await kis_portfolio_sync.stop()
    await kis_realtime.stop()
    await price_alert_worker.stop()
    await ws_manager.stop_broadcast_loop()
    await market_data.stop_refresh_loop()
    try:
        await close_db()
    except Exception as exc:
        logger.warning("DB close: %s", exc)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="한국/미국 주식 API (실시간 WebSocket 지원)",
    lifespan=lifespan,
)

_cors_regex = settings.CORS_ORIGIN_REGEX.strip() or None
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=_cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=f"{settings.API_V1_PREFIX}/health")
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["인증"])
app.include_router(me_data.router, prefix=f"{settings.API_V1_PREFIX}")
app.include_router(tools.router, prefix=f"{settings.API_V1_PREFIX}")
app.include_router(
    oauth_social.router,
    prefix=f"{settings.API_V1_PREFIX}/auth/oauth",
)
app.include_router(
    integrations.router,
    prefix=f"{settings.API_V1_PREFIX}/integrations",
)
app.include_router(stocks.router, prefix=f"{settings.API_V1_PREFIX}/stocks", tags=["주식"])
app.include_router(
    stocks_docx_compat.router,
    prefix=f"{settings.API_V1_PREFIX}/stocks",
)
app.include_router(kr_dashboard.router, prefix=f"{settings.API_V1_PREFIX}")
app.include_router(market.router, prefix=f"{settings.API_V1_PREFIX}")
app.include_router(config_public.router, prefix=f"{settings.API_V1_PREFIX}")
app.include_router(content.router, prefix=f"{settings.API_V1_PREFIX}", tags=["콘텐츠"])
app.include_router(chat.router, prefix=f"{settings.API_V1_PREFIX}/chat")
app.include_router(
    portfolio.router,
    prefix=f"{settings.API_V1_PREFIX}/portfolio",
    tags=["포트폴리오"],
)
app.include_router(
    accounts.router,
    prefix=f"{settings.API_V1_PREFIX}/accounts",
)
app.include_router(ws.router, prefix=f"{settings.API_V1_PREFIX}/ws")


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    logger.exception("Unhandled error on %s", request.url.path)
    detail = str(exc) if settings.DEBUG else "서버 내부 오류가 발생했습니다."
    return JSONResponse(status_code=500, content={"detail": detail})


@app.get("/")
async def root():
    return {
        "message": "Stock API",
        "docs": "/docs",
        "websocket": f"{settings.API_V1_PREFIX}/ws/stocks",
        "endpoints": {
            "korea_stocks": f"{settings.API_V1_PREFIX}/stocks/korea",
            "us_stocks": f"{settings.API_V1_PREFIX}/stocks/us",
            "portfolio": f"{settings.API_V1_PREFIX}/portfolio",
        },
    }

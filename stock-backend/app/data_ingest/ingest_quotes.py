"""DOCX ingest-quotes — 일봉 → kr_stock_quotes."""

import logging
from datetime import date

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.korea_universe import KOREA_UNIVERSE
from app.models.kr_stock_catalog import KrStockDailyQuote
from app.services.chart_service import chart_service

logger = logging.getLogger(__name__)


async def ingest_quotes_for_code(session: AsyncSession, code: str, limit: int = 120) -> int:
    hist = await chart_service.get_history(code, "korea", "1y")
    raw_points = hist.get("points") or []
    points = raw_points[-limit:] if raw_points else []
    if not points:
        return 0
    rows = []
    for p in points:
        d = p.time[:10] if p.time else None
        if not d:
            continue
        rows.append(
            {
                "code": code,
                "quote_date": date.fromisoformat(d),
                "open": float(p.open),
                "high": float(p.high),
                "low": float(p.low),
                "close": float(p.close),
                "volume": float(p.volume),
                "amount": None,
            }
        )
    if not rows:
        return 0
    stmt = pg_insert(KrStockDailyQuote).values(rows)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_kr_quote_code_date",
        set_={
            "open": stmt.excluded.open,
            "high": stmt.excluded.high,
            "low": stmt.excluded.low,
            "close": stmt.excluded.close,
            "volume": stmt.excluded.volume,
        },
    )
    await session.execute(stmt)
    return len(rows)


async def ingest_all_quotes(session: AsyncSession, max_codes: int | None = None) -> int:
    codes = [m["symbol"] for m in KOREA_UNIVERSE]
    if max_codes:
        codes = codes[:max_codes]
    total = 0
    for code in codes:
        try:
            n = await ingest_quotes_for_code(session, code)
            total += n
        except Exception as exc:
            logger.warning("quotes skip %s: %s", code, exc)
    await session.commit()
    logger.info("ingest_quotes: %s bars for %s codes", total, len(codes))
    return total

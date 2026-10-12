"""DOCX ingest-stocks — KOREA_UNIVERSE + live cache → kr_stocks."""

import asyncio
import logging

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.korea_universe import KOREA_UNIVERSE
from app.models.kr_stock_catalog import KrStockMaster
from app.services.market_data import market_data

logger = logging.getLogger(__name__)


async def ingest_stocks(session: AsyncSession) -> int:
    rows = []
    for meta in KOREA_UNIVERSE:
        code = meta["symbol"]
        live = market_data.get_by_symbol(code) or {}
        rows.append(
            {
                "code": code,
                "name": live.get("name") or meta.get("name") or code,
                "name_en": None,
                "market": live.get("market") or meta.get("market"),
                "sector": live.get("sector") or meta.get("sector"),
                "industry": meta.get("industry"),
                "market_cap": live.get("market_cap"),
            }
        )
    if not rows:
        return 0
    stmt = pg_insert(KrStockMaster).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["code"],
        set_={
            "name": stmt.excluded.name,
            "market": stmt.excluded.market,
            "sector": stmt.excluded.sector,
            "industry": stmt.excluded.industry,
            "market_cap": stmt.excluded.market_cap,
        },
    )
    await session.execute(stmt)
    await session.commit()
    logger.info("ingest_stocks: upserted %s rows", len(rows))
    return len(rows)

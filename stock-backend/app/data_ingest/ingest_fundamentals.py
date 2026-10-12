"""DOCX ingest-fundamentals — KR_FUNDAMENTAL_SEED → kr_fundamental_snapshots."""

import logging

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.kr_seed_analytics import KR_FUNDAMENTAL_SEED
from app.models.kr_analytics import KrFundamentalSnapshot

logger = logging.getLogger(__name__)


async def ingest_fundamentals(session: AsyncSession) -> int:
    rows = []
    for code, f in KR_FUNDAMENTAL_SEED.items():
        rows.append(
            {
                "code": code,
                "fiscal_year": f.get("fiscal_year"),
                "fiscal_quarter": f.get("fiscal_quarter"),
                "per": f.get("per"),
                "pbr": f.get("pbr"),
                "roe": f.get("roe"),
                "op_margin": f.get("op_margin"),
                "net_margin": f.get("net_margin"),
                "debt_ratio": f.get("debt_ratio"),
                "dividend_yield": f.get("dividend_yield"),
                "industry": f.get("industry"),
            }
        )
    if not rows:
        return 0
    stmt = pg_insert(KrFundamentalSnapshot).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["code"],
        set_={
            "fiscal_year": stmt.excluded.fiscal_year,
            "fiscal_quarter": stmt.excluded.fiscal_quarter,
            "per": stmt.excluded.per,
            "pbr": stmt.excluded.pbr,
            "roe": stmt.excluded.roe,
            "op_margin": stmt.excluded.op_margin,
            "net_margin": stmt.excluded.net_margin,
            "debt_ratio": stmt.excluded.debt_ratio,
            "dividend_yield": stmt.excluded.dividend_yield,
            "industry": stmt.excluded.industry,
        },
    )
    await session.execute(stmt)
    await session.commit()
    logger.info("ingest_fundamentals: %s rows", len(rows))
    return len(rows)

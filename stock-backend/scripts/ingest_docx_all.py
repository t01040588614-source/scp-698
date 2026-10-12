"""DOCX ETL 일괄 실행: stocks → fundamentals → quotes (+ analytics seed)."""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.data_ingest.ingest_fundamentals import ingest_fundamentals
from app.data_ingest.ingest_quotes import ingest_all_quotes
from app.data_ingest.ingest_stocks import ingest_stocks
from app.db.session import async_session_maker, init_db
from app.services.kr_dashboard_service import seed_kr_analytics


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="DOCX ETL (stocks, fundamentals, quotes)")
    p.add_argument(
        "--max-codes",
        type=int,
        default=0,
        help="시세 적재 종목 수 상한 (0=전체 유니버스, 기본 0)",
    )
    return p.parse_args()


async def main():
    args = parse_args()
    max_codes = args.max_codes if args.max_codes > 0 else None
    await init_db()
    async with async_session_maker() as session:
        n1 = await ingest_stocks(session)
        n2 = await ingest_fundamentals(session)
        await seed_kr_analytics(session)
        n3 = await ingest_all_quotes(session, max_codes=max_codes)
        await session.commit()
    cap = max_codes if max_codes else "all"
    print(f"ingest_docx_all done (max_codes={cap}): stocks={n1}, fundamentals={n2}, quote_bars={n3}")


if __name__ == "__main__":
    asyncio.run(main())

"""DOCX ingest-stocks/quotes/fundamentals 대응 — 재무·뉴스·컨센서스 시드."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import async_session_maker, init_db
from app.services.kr_dashboard_service import seed_kr_analytics


async def main():
    await init_db()
    async with async_session_maker() as session:
        await seed_kr_analytics(session)
    print("ingest_kr_analytics done")


if __name__ == "__main__":
    asyncio.run(main())

"""모든 계좌 일별 스냅샷 갱신 (cron / 작업 스케줄러용)."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import async_session_maker, init_db
from app.services.accounts_service import AccountsService


async def main() -> None:
    await init_db()
    async with async_session_maker() as session:
        service = AccountsService(session)
        n = await service.snapshot_all_accounts()
        await session.commit()
    print(f"daily_snapshot_job: updated {n} account(s)")


if __name__ == "__main__":
    asyncio.run(main())

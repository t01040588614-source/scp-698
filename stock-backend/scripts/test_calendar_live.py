import asyncio

from app.services.economic_calendar_service import get_economic_calendar


async def main() -> None:
    r = await get_economic_calendar(force_refresh=True)
    print("count", r["count"], "kr", r["kr_count"], "us", r["us_count"], "sources", r["sources"])
    us = [e for e in r["data"] if e.get("country") == "US"][:8]
    for e in us:
        print("US", e["date"], e["time"], e["event"][:50], e.get("source"))


if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.stock_providers.yahoo_korea_provider import YahooKoreaProvider


async def main():
    p = YahooKoreaProvider()
    r = await p.get_stocks()
    print("count", len(r))
    if r:
        print("sample", r[0]["symbol"], r[0]["name"], r[0]["price"])


if __name__ == "__main__":
    asyncio.run(main())

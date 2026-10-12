"""Quick WS push check — run with stock-backend venv Python."""
import asyncio
import json
import sys
import time
import urllib.request

API = "http://127.0.0.1:8000/api/v1"
WS = "ws://127.0.0.1:8000/api/v1/ws/stocks"


def cache_status():
    with urllib.request.urlopen(f"{API}/market/cache-status", timeout=10) as r:
        return json.loads(r.read())


def samsung_rest_price() -> float | None:
    with urllib.request.urlopen(f"{API}/stocks/korea", timeout=45) as r:
        rows = json.loads(r.read())
    for row in rows:
        if row.get("symbol") == "005930":
            return float(row.get("price"))
    return None


async def ws_probe(seconds: float = 10.0):
    import websockets

    types: dict[str, int] = {}
    prices: list[float] = []
    async with websockets.connect(WS, open_timeout=8) as ws:
        await ws.send(
            json.dumps(
                {
                    "action": "subscribe",
                    "symbols": ["005930"],
                    "indexIds": ["kospi", "kosdaq"],
                }
            )
        )
        end = time.time() + seconds
        while time.time() < end:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
            except asyncio.TimeoutError:
                continue
            m = json.loads(raw)
            t = m.get("type") or "?"
            types[t] = types.get(t, 0) + 1
            if t == "quotes" and isinstance(m.get("data"), dict):
                p = m["data"].get("005930")
                if p is not None:
                    prices.append(float(p))
            if t == "ticks" and isinstance(m.get("data"), list):
                for row in m["data"]:
                    if row.get("symbol") == "005930" and row.get("price") is not None:
                        prices.append(float(row["price"]))
    return types, prices


def main() -> int:
    c = cache_status()
    print(
        f"cache_age={c.get('cache_age_seconds')}s krOpen={c.get('krMarketOpen')} "
        f"usOpen={c.get('usMarketOpen')} ws_push={c.get('ws_push_interval_sec')}s"
    )
    if c.get("message"):
        print("message:", c.get("message"))

    p1 = samsung_rest_price()
    time.sleep(5)
    p2 = samsung_rest_price()
    c2 = cache_status()
    print(f"REST 005930: t0={p1} t+5s={p2} cache_age={c2.get('cache_age_seconds')}s")

    types, prices = asyncio.run(ws_probe(10.0))
    print("ws_frames:", types)
    print("005930_samples:", len(prices), "last:", prices[-1] if prices else None)

    ok = bool(types.get("quotes") or types.get("ticks") or types.get("indices"))
    if not ok:
        print("FAIL: no broadcast frames")
        return 1

    q = types.get("quotes", 0)
    t = types.get("ticks", 0)
    if q >= 3 or t >= 3:
        print(f"OK: ~1s WS push ({q} quote, {t} tick frames in 10s)")
    elif len(prices) >= 1:
        print(f"OK: WS delivers 005930 ({q} quote frames in 10s; UI still updates on each push)")
    else:
        print("WARN: WS active but no 005930 in payload")
    return 0


if __name__ == "__main__":
    sys.exit(main())

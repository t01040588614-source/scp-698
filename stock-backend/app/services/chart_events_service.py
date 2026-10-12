"""Investing.com 스타일 차트 이벤트 — 배당(D) · 실적(E)."""

from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from app.data.chart_events_seed import CHART_EVENTS_SEED
from app.data.key_stats_profiles import KEY_STATS_PROFILES
logger = logging.getLogger(__name__)

PERIOD_EVENT_DAYS: dict[str, int] = {
    "1d": 5,
    "1w": 14,
    "1m": 45,
    "3m": 120,
    "6m": 200,
    "1y": 400,
    "5y": 365 * 6,
    "max": 365 * 30,
}


class ChartEventsService:
    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._cache: dict[tuple[str, str], tuple[datetime, list[dict]]] = {}

    def _resolve_yahoo_ticker(self, symbol: str, market: str) -> str:
        from app.services.market_data import market_data

        if market == "us":
            return symbol.upper()
        stock = market_data.get_by_symbol(symbol)
        exchange = (stock or {}).get("market", "KOSPI")
        suffix = ".KQ" if str(exchange).upper() == "KOSDAQ" else ".KS"
        return f"{symbol}{suffix}"

    def _fetch_yahoo_dividends_sync(self, yahoo_ticker: str) -> list[dict]:
        try:
            import yfinance as yf

            divs = yf.Ticker(yahoo_ticker).dividends
            if divs is None or divs.empty:
                return []
            out: list[dict] = []
            for ts, amount in divs.items():
                if hasattr(ts, "to_pydatetime"):
                    dt = ts.to_pydatetime()
                else:
                    dt = datetime.fromisoformat(str(ts))
                out.append(
                    {
                        "type": "dividend",
                        "date": dt.date().isoformat(),
                        "label": "D",
                        "amount": round(float(amount), 4),
                        "title": "배당",
                    }
                )
            return out[-60:]
        except Exception as exc:
            logger.debug("yahoo dividends %s: %s", yahoo_ticker, exc)
            return []

    def _seed_events(self, symbol: str) -> list[dict]:
        seed = CHART_EVENTS_SEED.get(symbol) or {}
        profile = KEY_STATS_PROFILES.get(symbol, {})
        events: list[dict] = []
        for d in seed.get("dividends") or []:
            events.append(
                {"type": "dividend", "date": str(d)[:10], "label": "D", "title": "배당"}
            )
        for d in seed.get("earnings") or []:
            events.append(
                {"type": "earnings", "date": str(d)[:10], "label": "E", "title": "실적 발표"}
            )
        next_e = seed.get("next_earnings") or profile.get("next_earnings")
        if next_e:
            events.append(
                {
                    "type": "earnings",
                    "date": str(next_e)[:10],
                    "label": "E",
                    "title": "실적 발표 (예정)",
                    "future": True,
                }
            )
        return events

    def _filter_by_period(self, events: list[dict], period: str) -> list[dict]:
        days = PERIOD_EVENT_DAYS.get(period, 400)
        cutoff = datetime.now().date() - timedelta(days=days)
        out: list[dict] = []
        for ev in events:
            try:
                d = datetime.fromisoformat(str(ev["date"])).date()
            except ValueError:
                continue
            if d >= cutoff or ev.get("future"):
                out.append(ev)
        return out

    async def get_events(self, symbol: str, market: str, period: str) -> dict:
        cache_key = (symbol, market)
        cached = self._cache.get(cache_key)
        if cached and (datetime.now() - cached[0]).total_seconds() < 3600:
            raw = cached[1]
        else:
            yahoo_ticker = self._resolve_yahoo_ticker(symbol, market)
            loop = asyncio.get_event_loop()
            dividends = await loop.run_in_executor(
                self._executor, self._fetch_yahoo_dividends_sync, yahoo_ticker
            )
            raw = dividends + self._seed_events(symbol)
            # dedupe by date+type
            seen: set[tuple[str, str]] = set()
            deduped: list[dict] = []
            for ev in sorted(raw, key=lambda x: x["date"]):
                key = (ev["date"], ev["type"])
                if key in seen:
                    continue
                seen.add(key)
                deduped.append(ev)
            self._cache[cache_key] = (datetime.now(), deduped)
            raw = deduped

        filtered = self._filter_by_period(raw, period)
        return {
            "symbol": symbol,
            "market": market,
            "period": period,
            "events": filtered,
            "legend": [
                {"key": "D", "label": "배당"},
                {"key": "E", "label": "실적"},
            ],
        }


chart_events_service = ChartEventsService()

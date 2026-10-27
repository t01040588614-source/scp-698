"""경제 캘린더 — Finnhub · Forex Factory · Yahoo Finance 통합 + 캐시."""

from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx

from app.integrations import finnhub_client
from app.services.kr_economic_calendar import fetch_bok_events, fetch_kostat_events
from app.services.us_economic_calendar import (
    fetch_bls_events,
    fetch_census_events,
    fetch_fomc_events,
)

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")

FF_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
FF_HEADERS = {
    "User-Agent": "MarketLens/1.0 (+local dashboard; economic calendar)",
    "Accept": "application/json",
}

# Forex Factory currency column → 표시 국가 코드
_CURRENCY_COUNTRY: dict[str, str] = {
    "USD": "US",
    "EUR": "EU",
    "GBP": "UK",
    "JPY": "JP",
    "AUD": "AU",
    "NZD": "NZ",
    "CAD": "CA",
    "CHF": "CH",
    "CNY": "CN",
    "KRW": "KR",
    "All": "ALL",
}

_cache: dict[str, object] = {
    "events": [],
    "fetched_at": None,
    "sources": [],
    "from": None,
    "to": None,
}
_cache_lock = asyncio.Lock()
_CACHE_TTL_SEC = 300


def _default_range() -> tuple[date, date]:
    today = datetime.now(KST).date()
    return today - timedelta(days=7), today + timedelta(days=30)


def _parse_range(from_str: str | None, to_str: str | None) -> tuple[date, date]:
    start, end = _default_range()
    try:
        if from_str:
            start = date.fromisoformat(from_str[:10])
        if to_str:
            end = date.fromisoformat(to_str[:10])
    except ValueError:
        start, end = _default_range()
    if end < start:
        start, end = end, start
    if (end - start).days > 45:
        end = start + timedelta(days=45)
    return start, end


def _impact_norm(raw: str | None) -> str:
    s = (raw or "").strip().lower()
    if s in ("high", "3"):
        return "high"
    if s in ("medium", "med", "2"):
        return "medium"
    if s in ("holiday", "non-economic"):
        return "low"
    return "low" if s == "low" else "medium"


def _country_norm(code: str | None) -> str:
    c = (code or "").strip().upper()
    if not c:
        return "—"
    if c in _CURRENCY_COUNTRY:
        return _CURRENCY_COUNTRY[c]
    if len(c) == 2:
        return c
    if c in ("USA", "UNITED STATES"):
        return "US"
    if c in ("KOREA", "SOUTH KOREA", "REPUBLIC OF KOREA"):
        return "KR"
    return c[:3]


def _fmt_val(val: object) -> str:
    if val is None or val == "":
        return "—"
    if isinstance(val, float):
        if val != val:
            return "—"
        return str(val)
    return str(val).strip() or "—"


def _event_id(parts: dict) -> str:
    raw = "|".join(str(parts.get(k, "")) for k in ("date", "time", "country", "event"))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _in_range(day: date, start: date, end: date) -> bool:
    return start <= day <= end


def _normalize_row(
    *,
    event: str,
    country: str,
    dt_kst: datetime,
    impact: str,
    forecast: str,
    previous: str,
    actual: str | None,
    source: str,
) -> dict:
    day = dt_kst.date()
    return {
        "id": _event_id(
            {
                "date": day.isoformat(),
                "time": dt_kst.strftime("%H:%M"),
                "country": country,
                "event": event,
            }
        ),
        "date": day.isoformat(),
        "time": dt_kst.strftime("%H:%M"),
        "country": country,
        "event": event,
        "impact": _impact_norm(impact),
        "forecast": forecast,
        "previous": previous,
        "actual": actual,
        "source": source,
        "sort_ts": dt_kst.timestamp(),
    }


def _parse_ff_rows(rows: list[dict], start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for row in rows:
        title = str(row.get("title") or "").strip()
        if not title:
            continue
        raw_date = row.get("date")
        if not raw_date:
            continue
        try:
            dt = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
        except ValueError:
            continue
        dt_kst = dt.astimezone(KST)
        if not _in_range(dt_kst.date(), start, end):
            continue
        country = _country_norm(str(row.get("country") or ""))
        if country == "ALL":
            continue
        impact_raw = str(row.get("impact") or "Medium")
        out.append(
            _normalize_row(
                event=title,
                country=country,
                dt_kst=dt_kst,
                impact=impact_raw,
                forecast=_fmt_val(row.get("forecast")),
                previous=_fmt_val(row.get("previous")),
                actual=None,
                source="forex_factory",
            )
        )
    return out


def _parse_finnhub_rows(rows: list[dict], start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for row in rows:
        event = str(row.get("event") or "").strip()
        if not event:
            continue
        country = _country_norm(str(row.get("country") or ""))
        time_str = row.get("time") or row.get("date")
        dt_kst: datetime | None = None
        if time_str:
            try:
                if isinstance(time_str, (int, float)):
                    dt_kst = datetime.fromtimestamp(float(time_str), tz=KST)
                else:
                    s = str(time_str).replace("Z", "+00:00")
                    dt = datetime.fromisoformat(s)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
                    dt_kst = dt.astimezone(KST)
            except (ValueError, OSError, OverflowError):
                dt_kst = None
        if dt_kst is None:
            continue
        if not _in_range(dt_kst.date(), start, end):
            continue
        actual_raw = row.get("actual")
        actual = None if actual_raw in (None, "") else _fmt_val(actual_raw)
        if actual == "—":
            actual = None
        out.append(
            _normalize_row(
                event=event,
                country=country,
                dt_kst=dt_kst,
                impact=str(row.get("impact") or "medium"),
                forecast=_fmt_val(row.get("estimate") or row.get("forecast")),
                previous=_fmt_val(row.get("prev") or row.get("previous")),
                actual=actual,
                source="finnhub",
            )
        )
    return out


def _parse_yahoo_rows(records: list[dict], start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for row in records:
        event = str(row.get("Event") or row.get("econ_release") or row.get("event") or "").strip()
        if not event:
            continue
        country = _country_norm(
            str(row.get("Region") or row.get("country_code") or row.get("Country Code") or "")
        )
        ts = row.get("Event Time") or row.get("startdatetime")
        dt_kst: datetime | None = None
        if ts is not None:
            try:
                if isinstance(ts, (int, float)):
                    dt_kst = datetime.fromtimestamp(float(ts), tz=KST)
                else:
                    s = str(ts)
                    if s.isdigit():
                        dt_kst = datetime.fromtimestamp(int(s), tz=KST)
                    else:
                        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=ZoneInfo("UTC"))
                        dt_kst = dt.astimezone(KST)
            except (ValueError, OSError, OverflowError):
                dt_kst = None
        if dt_kst is None:
            continue
        if not _in_range(dt_kst.date(), start, end):
            continue
        actual_raw = row.get("Actual") or row.get("after_release_actual")
        actual = None if actual_raw in (None, "") else _fmt_val(actual_raw)
        if actual == "—":
            actual = None
        out.append(
            _normalize_row(
                event=event,
                country=country,
                dt_kst=dt_kst,
                impact="medium",
                forecast=_fmt_val(row.get("Expected") or row.get("consensus_estimate")),
                previous=_fmt_val(row.get("Last") or row.get("prior_release_actual")),
                actual=actual,
                source="yahoo",
            )
        )
    return out


async def _fetch_forex_factory() -> list[dict]:
    try:
        async with httpx.AsyncClient(headers=FF_HEADERS, follow_redirects=True) as client:
            resp = await client.get(FF_URL, timeout=20.0)
            if resp.status_code != 200:
                logger.debug("Forex Factory calendar HTTP %s", resp.status_code)
                return []
            data = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Forex Factory calendar failed: %s", exc)
        return []
    if not isinstance(data, list):
        return []
    return data


def _fetch_yahoo_sync(start: date, end: date) -> list[dict]:
    try:
        import yfinance as yf
    except ImportError:
        return []

    rows: list[dict] = []
    cal = yf.Calendars(start=start.isoformat(), end=end.isoformat())
    offset = 0
    while offset < 400:
        try:
            df = cal.get_economic_events_calendar(
                start=start.isoformat(),
                end=end.isoformat(),
                limit=100,
                offset=offset,
                force=True,
            )
        except Exception as exc:
            if exc.__class__.__name__ == "YFRateLimitError":
                logger.info("Yahoo economic calendar rate-limited")
            else:
                logger.debug("Yahoo calendar page failed: %s", exc)
            break
        if df is None or df.empty:
            break
        rows.extend(df.reset_index().to_dict(orient="records"))
        if len(df) < 100:
            break
        offset += 100
    return rows


def _merge_events(*groups: list[dict]) -> list[dict]:
    seen: set[str] = set()
    merged: list[dict] = []
    for group in groups:
        for ev in group:
            key = f"{ev['date']}|{ev['time']}|{ev['country']}|{ev['event']}".lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(ev)
    merged.sort(key=lambda e: (e.get("sort_ts") or 0, e.get("event") or ""))
    for ev in merged:
        ev.pop("sort_ts", None)
    return merged


async def _load_live(start: date, end: date) -> tuple[list[dict], list[str]]:
    sources: list[str] = []
    ff_task = asyncio.create_task(_fetch_forex_factory())
    fh_task = asyncio.create_task(finnhub_client.economic_calendar(start, end))
    yh_task = asyncio.to_thread(_fetch_yahoo_sync, start, end)
    bok_task = asyncio.to_thread(fetch_bok_events, start, end)
    kostat_task = asyncio.to_thread(fetch_kostat_events, start, end)
    census_task = asyncio.to_thread(fetch_census_events, start, end)
    bls_task = asyncio.to_thread(fetch_bls_events, start, end)
    fomc_task = asyncio.to_thread(fetch_fomc_events, start, end)

    (
        ff_raw,
        fh_raw,
        yh_raw,
        bok_raw,
        kostat_raw,
        census_raw,
        bls_raw,
        fomc_raw,
    ) = await asyncio.gather(
        ff_task, fh_task, yh_task, bok_task, kostat_task, census_task, bls_task, fomc_task
    )

    chunks: list[list[dict]] = []
    if bok_raw:
        chunks.append(bok_raw)
        sources.append("bok_kr")
    if kostat_raw:
        chunks.append(kostat_raw)
        sources.append("kostat_kr")
    if census_raw:
        chunks.append(census_raw)
        sources.append("us_census")
    if bls_raw:
        chunks.append(bls_raw)
        sources.append("us_bls")
    if fomc_raw:
        chunks.append(fomc_raw)
        sources.append("fed_fomc")
    if fh_raw:
        parsed = _parse_finnhub_rows(fh_raw, start, end)
        if parsed:
            chunks.append(parsed)
            sources.append("finnhub")
    if ff_raw:
        parsed = _parse_ff_rows(ff_raw, start, end)
        if parsed:
            chunks.append(parsed)
            sources.append("forex_factory")
    if yh_raw:
        parsed = _parse_yahoo_rows(yh_raw, start, end)
        if parsed:
            chunks.append(parsed)
            sources.append("yahoo")

    events = _merge_events(*chunks) if chunks else []
    for ev in events:
        if not ev.get("id"):
            ev["id"] = _event_id(
                {
                    "date": ev.get("date"),
                    "time": ev.get("time"),
                    "country": ev.get("country"),
                    "event": ev.get("event"),
                }
            )
    return events, sources


async def get_economic_calendar(
    from_str: str | None = None,
    to_str: str | None = None,
    *,
    force_refresh: bool = False,
) -> dict:
    start, end = _parse_range(from_str, to_str)
    now = datetime.now(KST)

    async with _cache_lock:
        fetched_at = _cache.get("fetched_at")
        if (
            not force_refresh
            and fetched_at
            and isinstance(fetched_at, datetime)
            and _cache.get("from") == start.isoformat()
            and _cache.get("to") == end.isoformat()
            and (now - fetched_at).total_seconds() < _CACHE_TTL_SEC
            and _cache.get("events")
        ):
            cached_events = _cache["events"]
            cached_sources = _cache.get("sources") or []
            return _response(
                list(cached_events) if isinstance(cached_events, list) else [],
                list(cached_sources) if isinstance(cached_sources, list) else [],
                fetched_at,
                start,
                end,
                "cache",
            )

    events, sources = await _load_live(start, end)

    async with _cache_lock:
        _cache["events"] = events
        _cache["fetched_at"] = now
        _cache["sources"] = sources
        _cache["from"] = start.isoformat()
        _cache["to"] = end.isoformat()

    status = "live" if events else "empty"
    return _response(events, sources, now, start, end, status)


def _response(
    events: list[dict],
    sources: list[str],
    fetched_at: datetime,
    start: date,
    end: date,
    status: str,
) -> dict:
    kr_count = sum(1 for e in events if e.get("country") == "KR")
    us_count = sum(1 for e in events if e.get("country") == "US")
    return {
        "data": events,
        "status": status,
        "sources": sources,
        "count": len(events),
        "kr_count": kr_count,
        "us_count": us_count,
        "from": start.isoformat(),
        "to": end.isoformat(),
        "fetched_at": fetched_at.astimezone(KST).isoformat(),
        "refresh_sec": _CACHE_TTL_SEC,
    }

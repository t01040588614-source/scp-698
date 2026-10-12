"""미국 경제 캘린더 — Census · BLS · 연준 FOMC 공식 일정."""

from __future__ import annotations

import logging
import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

import httpx

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")
ET = ZoneInfo("America/New_York")
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; MarketLens/1.0; +economic calendar)"}

FOMC_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
CENSUS_URL = "https://www.census.gov/economic-indicators/calendar-listview.html"

_STMT_DATE_RE = re.compile(r"monetary(\d{4})(\d{2})(\d{2})[a-z0-9]*\.(?:htm|pdf)", re.I)
_BLS_TIME_RE = re.compile(r"(\d{1,2}):(\d{2})\s*(AM|PM)", re.I)

_US_HIGH_KW = (
    "Consumer Price Index",
    "Employment Situation",
    "Gross Domestic Product",
    "Producer Price Index",
    "Personal Income and Outlays",
    "Advance Monthly Sales for Retail",
    "FOMC",
    "Nonfarm",
)


def _years_between(start: date, end: date) -> range:
    return range(start.year, end.year + 1)


def _impact(event: str) -> str:
    for kw in _US_HIGH_KW:
        if kw.lower() in event.lower():
            return "high"
    return "medium"


def _row(
    *,
    event: str,
    dt_et: datetime,
    source: str,
    impact: str | None = None,
) -> dict:
    dt_kst = dt_et.astimezone(KST)
    return {
        "date": dt_kst.date().isoformat(),
        "time": dt_kst.strftime("%H:%M"),
        "country": "US",
        "event": event,
        "impact": impact or _impact(event),
        "forecast": "—",
        "previous": "—",
        "actual": None,
        "source": source,
        "sort_ts": dt_kst.timestamp(),
    }


def _parse_et_time(time_raw: str, day: date) -> datetime | None:
    s = time_raw.strip()
    if not s:
        return None
    m = _BLS_TIME_RE.search(s)
    if not m:
        return None
    hour = int(m.group(1))
    minute = int(m.group(2))
    ampm = m.group(3).upper()
    if ampm == "PM" and hour < 12:
        hour += 12
    if ampm == "AM" and hour == 12:
        hour = 0
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=ET)


def _parse_bls_date(text: str) -> date | None:
    s = text.strip()
    if not s or s.startswith("BY MONTH"):
        return None
    try:
        return datetime.strptime(s, "%A, %B %d, %Y").date()
    except ValueError:
        return None


def _parse_fomc_html(html: str, start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for year in _years_between(start, end):
        marker = f"{year} FOMC"
        idx = html.find(marker)
        if idx < 0:
            continue
        chunk = html[idx : idx + 120_000]
        next_year = html.find(" FOMC Meetings", idx + 20)
        if next_year > idx:
            chunk = html[idx:next_year]

        for stmt in _STMT_DATE_RE.finditer(chunk):
            y, mo, d = int(stmt.group(1)), int(stmt.group(2)), int(stmt.group(3))
            day = date(y, mo, d)
            if not (start <= day <= end):
                continue
            dt_et = datetime(y, mo, d, 14, 0, tzinfo=ET)
            out.append(
                _row(
                    event="FOMC 금리 결정 및 성명",
                    dt_et=dt_et,
                    source="fed_fomc",
                    impact="high",
                )
            )

    seen: set[str] = set()
    deduped: list[dict] = []
    for ev in sorted(out, key=lambda e: e["sort_ts"]):
        key = ev["date"]
        if key in seen:
            continue
        seen.add(key)
        deduped.append(ev)
    return deduped


def _parse_census_html(html: str, start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for tr in re.finditer(r"<tr[^>]*height[^>]*>(.*?)</tr>", html, re.S | re.I):
        block = tr.group(1)
        title_m = re.search(r"<td[^>]*height[^>]*>\s*(?:<a[^>]*>)?\s*([^<]+)", block, re.I)
        key_m = re.search(r'sorttable_customkey="(\d{12,14})"', block, re.I)
        if not title_m or not key_m:
            continue
        title = re.sub(r"\s+", " ", title_m.group(1)).strip()
        if not title or title.lower() == "indicator":
            continue
        key = key_m.group(1)
        if len(key) < 12:
            continue
        y, mo, d = int(key[0:4]), int(key[4:6]), int(key[6:8])
        hour, minute = int(key[8:10]), int(key[10:12])
        day = date(y, mo, d)
        if not (start <= day <= end):
            continue
        dt_et = datetime(y, mo, d, hour, minute, tzinfo=ET)
        out.append(_row(event=title, dt_et=dt_et, source="us_census"))
    return out


def _parse_bls_html(html: str, start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for tr in re.finditer(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I):
        tds = re.findall(r"<td[^>]*class=\"[^\"]*\"[^>]*>(.*?)</td>", tr.group(1), re.S | re.I)
        if len(tds) < 3:
            continue
        day = _parse_bls_date(re.sub(r"<[^>]+>", " ", tds[0]))
        if day is None or not (start <= day <= end):
            continue
        time_raw = re.sub(r"<[^>]+>", " ", tds[1])
        time_raw = re.sub(r"\s+", " ", time_raw).strip()
        event = re.sub(r"<[^>]+>", " ", tds[2])
        event = re.sub(r"\s+", " ", event).strip()
        if not event or not time_raw:
            continue
        dt_et = _parse_et_time(time_raw, day)
        if dt_et is None:
            continue
        out.append(_row(event=event, dt_et=dt_et, source="us_bls"))
    return out


def fetch_fomc_events(start: date, end: date) -> list[dict]:
    try:
        resp = httpx.get(FOMC_URL, headers=HEADERS, timeout=25.0, follow_redirects=True)
        if resp.status_code != 200:
            logger.warning("FOMC calendar HTTP %s", resp.status_code)
            return []
        return _parse_fomc_html(resp.text, start, end)
    except httpx.HTTPError as exc:
        logger.warning("FOMC calendar fetch failed: %s", exc)
        return []


def fetch_census_events(start: date, end: date) -> list[dict]:
    try:
        resp = httpx.get(CENSUS_URL, headers=HEADERS, timeout=30.0, follow_redirects=True)
        if resp.status_code != 200:
            logger.warning("US Census calendar HTTP %s", resp.status_code)
            return []
        return _parse_census_html(resp.text, start, end)
    except httpx.HTTPError as exc:
        logger.warning("US Census calendar fetch failed: %s", exc)
        return []


def fetch_bls_events(start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for year in _years_between(start, end):
        url = f"https://www.bls.gov/schedule/{year}/home.htm"
        try:
            resp = httpx.get(url, headers=HEADERS, timeout=30.0, follow_redirects=True)
            if resp.status_code != 200:
                logger.warning("BLS calendar HTTP %s for %s", resp.status_code, year)
                continue
            out.extend(_parse_bls_html(resp.text, start, end))
        except httpx.HTTPError as exc:
            logger.warning("BLS calendar fetch failed %s: %s", year, exc)
    return out


def fetch_us_economic_events(start: date, end: date) -> list[dict]:
    """Census + BLS + FOMC (중복 일·시·제목 제거)."""
    seen: set[str] = set()
    merged: list[dict] = []
    for group in (
        fetch_census_events(start, end),
        fetch_bls_events(start, end),
        fetch_fomc_events(start, end),
    ):
        for ev in group:
            key = f"{ev['date']}|{ev['time']}|{ev['event']}".lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(ev)
    merged.sort(key=lambda e: e.get("sort_ts") or 0)
    return merged

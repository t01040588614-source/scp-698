"""한국 경제 캘린더 — 한국은행·국가데이터처(통계청) 공표일정."""

from __future__ import annotations

import logging
import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

import httpx

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")
BOK_LIST_URL = "https://www.bok.or.kr/portal/stats/statsPublictSchdul/listCldr.do"
KOSTAT_NEWS_PLAN_URL = "https://mods.go.kr/lcofNewsPln.es?mid=a60101000000"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; MarketLens/1.0; +economic calendar)"}

ROW_RE = re.compile(
    r"<tr[^>]*>.*?<td[^>]*>(\d{4}-\d{2}-\d{2})</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>(.*?)</td>",
    re.S | re.I,
)

KOSTAT_ROW_RE = re.compile(
    r'<td[^>]*class="center"[^>]*>\s*(\d{4}-\d{2}-\d{2})[^<]*</td>\s*<td[^>]*>(.*?)</td>',
    re.S | re.I,
)

_KOSTAT_HIGH_KW = ("소비자물가", "고용", "산업활동", "GDP", "국민계정", "실업")

_HIGH_KW = (
    "금통위",
    "기준금리",
    "GDP",
    "국민소득",
    "국제수지",
    "물가",
    "고용",
    "실업",
    "경상수지",
    "통화 및 유동성",
    "가계대출",
)


def _months_between(start: date, end: date) -> list[str]:
    months: list[str] = []
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        months.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            y += 1
            m = 1
    return months


def _strip_tags(html: str) -> str:
    text = re.sub(r"<br\s*/?>", " · ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _norm_time(raw: str) -> str:
    s = raw.strip()
    if not s:
        return "—"
    if re.fullmatch(r"\d{1,2}:\d{2}", s):
        h, mi = s.split(":")
        return f"{int(h):02d}:{mi}"
    return s


def _impact(event: str) -> str:
    for kw in _HIGH_KW:
        if kw in event:
            return "high"
    return "medium"


def _kostat_impact(event: str) -> str:
    for kw in _KOSTAT_HIGH_KW:
        if kw in event:
            return "high"
    return "medium"


def _kostat_release_time(title: str) -> str:
    if "산업활동" in title:
        return "12:00"
    return "08:00"


def _parse_kostat_html(html: str, start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for day_str, title_html in KOSTAT_ROW_RE.findall(html):
        try:
            day = date.fromisoformat(day_str)
        except ValueError:
            continue
        if not (start <= day <= end):
            continue
        title = _strip_tags(title_html)
        if not title:
            continue
        tm = _kostat_release_time(title)
        h, mi = int(tm[:2]), int(tm[3:5])
        dt_kst = datetime(day.year, day.month, day.day, h, mi, tzinfo=KST)
        out.append(
            {
                "date": day.isoformat(),
                "time": tm,
                "country": "KR",
                "event": title,
                "impact": _kostat_impact(title),
                "forecast": "—",
                "previous": "—",
                "actual": None,
                "source": "kostat_kr",
                "sort_ts": dt_kst.timestamp(),
            }
        )
    return out


def _parse_month_html(html: str, start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for day_str, time_raw, stats_html in ROW_RE.findall(html):
        try:
            day = date.fromisoformat(day_str)
        except ValueError:
            continue
        if not (start <= day <= end):
            continue
        event = _strip_tags(stats_html)
        if not event:
            continue
        tm = _norm_time(time_raw)
        try:
            h, mi = (0, 0) if tm == "—" else (int(tm[:2]), int(tm[3:5]))
            dt_kst = datetime(day.year, day.month, day.day, h, mi, tzinfo=KST)
        except ValueError:
            dt_kst = datetime(day.year, day.month, day.day, 9, 0, tzinfo=KST)
            tm = "09:00"
        out.append(
            {
                "date": day.isoformat(),
                "time": tm,
                "country": "KR",
                "event": event,
                "impact": _impact(event),
                "forecast": "—",
                "previous": "—",
                "actual": None,
                "source": "bok_kr",
                "sort_ts": dt_kst.timestamp(),
            }
        )
    return out


def fetch_bok_events(start: date, end: date) -> list[dict]:
    """동기 fetch — asyncio.to_thread 에서 호출."""
    events: list[dict] = []
    for ym in _months_between(start, end):
        url = f"{BOK_LIST_URL}?date={ym}&menuNo=200775"
        try:
            resp = httpx.get(url, headers=HEADERS, timeout=25.0, follow_redirects=True)
            if resp.status_code != 200:
                logger.warning("BOK calendar HTTP %s for %s", resp.status_code, ym)
                continue
            html = resp.content.decode("utf-8", errors="replace")
            events.extend(_parse_month_html(html, start, end))
        except httpx.HTTPError as exc:
            logger.warning("BOK calendar fetch failed %s: %s", ym, exc)
    return events


def fetch_kostat_events(start: date, end: date) -> list[dict]:
    """국가데이터처(구 통계청) 연간 통계공표·보도계획."""
    try:
        resp = httpx.get(
            KOSTAT_NEWS_PLAN_URL,
            headers=HEADERS,
            timeout=25.0,
            follow_redirects=True,
        )
        if resp.status_code != 200:
            logger.warning("KOSTAT calendar HTTP %s", resp.status_code)
            return []
        html = resp.content.decode("utf-8", errors="replace")
        return _parse_kostat_html(html, start, end)
    except httpx.HTTPError as exc:
        logger.warning("KOSTAT calendar fetch failed: %s", exc)
        return []

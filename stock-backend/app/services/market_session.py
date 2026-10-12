"""한국·미국 장 세션 — 휴장 캘린더·조기 마감·갱신 주기."""

from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from app.services.exchange_calendar import (
    krx_holiday_on,
    nyse_holiday_on,
    regular_close_time,
)

KST = ZoneInfo("Asia/Seoul")
ET = ZoneInfo("America/New_York")

MarketSessionKind = Literal["open", "closed", "pre", "after"]


def _minutes_since_midnight(t: time) -> int:
    return t.hour * 60 + t.minute


def _session_from_slots(
    *,
    minutes: int,
    open_start: int,
    open_end: int,
    pre_start: int | None,
    pre_end: int | None,
    after_start: int | None,
    after_end: int | None,
) -> MarketSessionKind:
    if open_start <= minutes < open_end:
        return "open"
    if pre_start is not None and pre_end is not None and pre_start <= minutes < pre_end:
        return "pre"
    if after_start is not None and after_end is not None and after_start <= minutes < after_end:
        return "after"
    return "closed"


def get_korea_market_session(now: datetime | None = None) -> MarketSessionKind:
    t = (now or datetime.now(KST)).astimezone(KST)
    if krx_holiday_on(t.date()):
        return "closed"
    if t.weekday() >= 5:
        return "closed"
    close_t = regular_close_time("kr", t.date())
    open_end = _minutes_since_midnight(close_t)
    minutes = t.hour * 60 + t.minute
    return _session_from_slots(
        minutes=minutes,
        open_start=9 * 60,
        open_end=open_end,
        pre_start=8 * 60,
        pre_end=9 * 60,
        after_start=open_end,
        after_end=16 * 60,
    )


def get_us_market_session(now: datetime | None = None) -> MarketSessionKind:
    t = (now or datetime.now(ET)).astimezone(ET)
    is_hol, _ = nyse_holiday_on(t.date())
    if is_hol:
        return "closed"
    if t.weekday() >= 5:
        return "closed"
    close_t = regular_close_time("us", t.date())
    open_end = _minutes_since_midnight(close_t)
    minutes = t.hour * 60 + t.minute
    return _session_from_slots(
        minutes=minutes,
        open_start=9 * 60 + 30,
        open_end=open_end,
        pre_start=4 * 60,
        pre_end=9 * 60 + 30,
        after_start=open_end,
        after_end=20 * 60,
    )


def is_korea_regular_session(now: datetime | None = None) -> bool:
    return get_korea_market_session(now) == "open"


def is_us_regular_session(now: datetime | None = None) -> bool:
    return get_us_market_session(now) == "open"


def is_any_regular_session() -> bool:
    return is_korea_regular_session() or is_us_regular_session()


def refresh_profile() -> dict[str, int]:
    if is_any_regular_session():
        return {
            "full_interval": 4,
            "fast_interval": 1,
            "fast_batch": 80,
            "ensure_fresh_sec": 3,
            "stale_push_sec": 2,
            "index_interval": 8,
        }
    return {
        "full_interval": 10,
        "fast_interval": 4,
        "fast_batch": 24,
        "ensure_fresh_sec": 18,
        "stale_push_sec": 12,
        "index_interval": 25,
    }


def _session_label(session: MarketSessionKind) -> str:
    return {
        "open": "Open",
        "pre": "Pre-market",
        "after": "After-hours",
        "closed": "Closed",
    }[session]


def _next_weekday_open_hint(exchange: str, from_dt: datetime) -> str:
    tz = KST if exchange == "kr" else ET
    t = from_dt.astimezone(tz)
    for _ in range(14):
        t = t + timedelta(days=1)
        d = t.date()
        if t.weekday() >= 5:
            continue
        if exchange == "kr" and krx_holiday_on(d):
            continue
        if exchange == "us":
            is_hol, _ = nyse_holiday_on(d)
            if is_hol:
                continue
        if exchange == "kr":
            return f"Next open {d.isoformat()} 09:00 KST"
        return f"Next open {d.isoformat()} 09:30 ET"
    return "Next open TBD"


def _region_detail(exchange: str, session: MarketSessionKind, now: datetime) -> str:
    tz = KST if exchange == "kr" else ET
    t = now.astimezone(tz)
    close_t = regular_close_time(exchange, t.date())
    close_s = close_t.strftime("%H:%M")
    if session == "open":
        tz = "KST" if exchange == "kr" else "ET"
        return f"Closes {close_s} {tz}"
    if session == "pre":
        return "Opens 09:00 KST" if exchange == "kr" else "Opens 09:30 ET"
    if session == "after":
        return "After-hours"
    return _next_weekday_open_hint(exchange, now)


def _session_tooltip(exchange: str, session: MarketSessionKind, holiday_name: str | None) -> str:
    market = "Korea" if exchange == "kr" else "US"
    schedule_kr = "Regular 09:00–15:30 KST · Pre 08:00–09:00 · After 15:30–16:00 · closed weekends & holidays"
    schedule_us = "Regular 09:30–16:00 ET · Pre 04:00–09:30 · After 16:00–20:00 · closed weekends & holidays"
    schedule = schedule_kr if exchange == "kr" else schedule_us
    if holiday_name:
        return f"{market} exchange holiday ({holiday_name}). {schedule}"
    if session == "open":
        return f"{market} regular session is open. {schedule}"
    if session == "pre":
        return (
            f"{'Korea pre-market' if exchange == 'kr' else 'US pre-market'} session. {schedule}"
        )
    if session == "after":
        return (
            f"{'Korea' if exchange == 'kr' else 'US'} regular session closed; after-hours. {schedule}"
        )
    return f"{market} market is closed. {schedule}"


def _region_payload(exchange: str, now: datetime) -> dict:
    tz = KST if exchange == "kr" else ET
    local = now.astimezone(tz)
    holiday = False
    holiday_name: str | None = None
    if exchange == "kr":
        holiday = krx_holiday_on(local.date())
        if holiday:
            holiday_name = "KRX 휴장"
    else:
        holiday, holiday_name = nyse_holiday_on(local.date())

    session = get_korea_market_session(now) if exchange == "kr" else get_us_market_session(now)
    close_t = regular_close_time(exchange, local.date())
    early = close_t != (time(15, 30) if exchange == "kr" else time(16, 0))

    return {
        "session": session,
        "label": _session_label(session),
        "regular_open": session == "open",
        "holiday": holiday,
        "holiday_name": holiday_name,
        "early_close": close_t.strftime("%H:%M") if early else None,
        "detail": _region_detail(exchange, session, now),
        "tooltip": _session_tooltip(exchange, session, holiday_name if holiday else None),
        "local_date": local.date().isoformat(),
        "timezone": "Asia/Seoul" if exchange == "kr" else "America/New_York",
    }


def session_status(now: datetime | None = None) -> dict:
    now = now or datetime.now(KST)
    kr = _region_payload("kr", now)
    us = _region_payload("us", now)
    return {
        "krMarketOpen": kr["regular_open"],
        "usMarketOpen": us["regular_open"],
        "krSession": kr["session"],
        "usSession": us["session"],
        "krHoliday": kr["holiday"],
        "usHoliday": us["holiday"],
        "krHolidayName": kr["holiday_name"],
        "usHolidayName": us["holiday_name"],
    }


def full_session_response(now: datetime | None = None) -> dict:
    now = now or datetime.now(KST)
    kr = _region_payload("kr", now)
    us = _region_payload("us", now)
    return {
        "server_time": now.astimezone(KST).isoformat(),
        "kr": kr,
        "us": us,
    }


def korea_session(now: datetime | None = None) -> str:
    return get_korea_market_session(now)


def us_session(now: datetime | None = None) -> str:
    return get_us_market_session(now)

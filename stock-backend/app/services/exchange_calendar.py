"""KRX·NYSE 휴장일·조기 마감 (FinanceDataReader calendars + 로컬 early_closes)."""

from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from datetime import date, time
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "market_holidays"
KST = ZoneInfo("Asia/Seoul")
ET = ZoneInfo("America/New_York")


@dataclass(frozen=True)
class EarlyClose:
    close: time


def _read_krx_holidays() -> set[str]:
    path = DATA_DIR / "holidays-krx.csv"
    out: set[str] = set()
    if not path.is_file():
        logger.warning("KRX holidays CSV missing: %s", path)
        return out
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            d = (row.get("date") or "").strip()
            if d:
                out.add(d)
    return out


def _read_nyse_holidays() -> dict[str, str]:
    path = DATA_DIR / "holidays-nyse.csv"
    out: dict[str, str] = {}
    if not path.is_file():
        logger.warning("NYSE holidays CSV missing: %s", path)
        return out
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            d = (row.get("date") or "").strip()
            if d:
                out[d] = (row.get("name") or "Market Holiday").strip()
    return out


def _read_early_closes() -> dict[tuple[str, str], EarlyClose]:
    path = DATA_DIR / "early_closes.csv"
    out: dict[tuple[str, str], EarlyClose] = {}
    if not path.is_file():
        return out
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            exchange = (row.get("exchange") or "").strip().lower()
            d = (row.get("date") or "").strip()
            if not exchange or not d:
                continue
            try:
                h = int(row.get("close_hour") or "0")
                m = int(row.get("close_minute") or "0")
            except ValueError:
                continue
            out[(exchange, d)] = EarlyClose(close=time(h, m))
    return out


@lru_cache(maxsize=1)
def _calendars() -> tuple[set[str], dict[str, str], dict[tuple[str, str], EarlyClose]]:
    return _read_krx_holidays(), _read_nyse_holidays(), _read_early_closes()


def reload_calendars() -> None:
    _calendars.cache_clear()


def krx_holiday_on(day: date) -> bool:
    krx, _, _ = _calendars()
    return day.isoformat() in krx


def nyse_holiday_on(day: date) -> tuple[bool, str | None]:
    _, nyse, _ = _calendars()
    key = day.isoformat()
    if key in nyse:
        return True, nyse[key]
    return False, None


def regular_close_time(exchange: str, day: date) -> time:
    """현지 기준 정규장 마감 시각 (조기 마감일 반영)."""
    _, _, early = _calendars()
    ex = exchange.lower()
    if ex == "kr":
        default = time(15, 30)
        key = ("kr", day.isoformat())
    elif ex == "us":
        default = time(16, 0)
        key = ("us", day.isoformat())
    else:
        return time(16, 0)
    ec = early.get(key)
    return ec.close if ec else default


def export_holiday_dates_for_frontend() -> dict:
    krx, nyse, early = _calendars()
    early_times: dict[str, str] = {}
    for (ex, d), ec in early.items():
        early_times[f"{ex}:{d}"] = ec.close.strftime("%H:%M")
    return {
        "kr": sorted(krx),
        "us": sorted(nyse.keys()),
        "earlyCloseTimes": early_times,
    }

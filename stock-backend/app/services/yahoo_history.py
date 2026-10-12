"""Yahoo Finance 시계열 — 429 완화(스로틀·재시도·download 폴백)."""

from __future__ import annotations

import logging
import time
from typing import Callable

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

try:
    from yfinance.exceptions import YFRateLimitError
except ImportError:  # pragma: no cover
    YFRateLimitError = Exception  # type: ignore[misc, assignment]

_INTRADAY_INTERVALS = frozenset({"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"})

_last_request_at = 0.0
_MIN_GAP_SEC = 0.4


def is_intraday_interval(interval: str) -> bool:
    return interval in _INTRADAY_INTERVALS or interval.endswith("m")


def _throttle() -> None:
    global _last_request_at
    now = time.time()
    wait = _MIN_GAP_SEC - (now - _last_request_at)
    if wait > 0:
        time.sleep(wait)
    _last_request_at = time.time()


def _normalize_download_df(df: pd.DataFrame, ticker: str) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()
    out = df.copy()
    if isinstance(out.columns, pd.MultiIndex):
        try:
            out.columns = out.columns.droplevel(1)
        except Exception:
            out.columns = [c[0] if isinstance(c, tuple) else c for c in out.columns]
    out = out.rename(columns=str.title)
    for col in ("Open", "High", "Low", "Close", "Volume"):
        if col not in out.columns:
            return pd.DataFrame()
    return out.dropna(subset=["Close"], how="all")


def _fetch_ticker_history(ticker: str, period: str, interval: str) -> pd.DataFrame:
    _throttle()
    hist = yf.Ticker(ticker).history(
        period=period, interval=interval, auto_adjust=True, timeout=25
    )
    if hist is None or hist.empty:
        return pd.DataFrame()
    return hist


def _fetch_download_history(ticker: str, period: str, interval: str) -> pd.DataFrame:
    _throttle()
    raw = yf.download(
        tickers=ticker,
        period=period,
        interval=interval,
        progress=False,
        threads=False,
        auto_adjust=True,
        timeout=25,
    )
    return _normalize_download_df(raw, ticker)


def fetch_history_dataframe(
    ticker: str,
    period: str,
    interval: str,
    *,
    extra_attempts: list[tuple[str, str]] | None = None,
) -> tuple[pd.DataFrame, str]:
    """
    (DataFrame, interval_used) — 실패 시 빈 DataFrame.
    extra_attempts: [(period, interval), ...] 추가 폴백.
    """
    attempts: list[tuple[str, str]] = [(period, interval)]
    if extra_attempts:
        attempts.extend(extra_attempts)

    fetchers: list[Callable[[str, str, str], pd.DataFrame]] = [
        _fetch_ticker_history,
        _fetch_download_history,
    ]

    for p, iv in attempts:
        for fetch in fetchers:
            for attempt in range(3):
                try:
                    df = fetch(ticker, p, iv)
                    if df is not None and not df.empty:
                        return df, iv
                except YFRateLimitError:
                    time.sleep(1.2 * (attempt + 1))
                except Exception as exc:
                    logger.debug(
                        "Yahoo history %s %s/%s via %s: %s",
                        ticker,
                        p,
                        iv,
                        fetch.__name__,
                        exc,
                    )
                    break
    return pd.DataFrame(), interval


def intraday_fallback_attempts(period: str, interval: str) -> list[tuple[str, str]]:
    """1일·1주 — 분·시간봉 단계적 폴백."""
    if period == "1d":
        return [
            ("1d", "5m"),
            ("5d", "5m"),
            ("5d", "15m"),
            ("5d", "30m"),
            ("5d", "1h"),
        ]
    if period == "1w":
        return [
            ("5d", "15m"),
            ("5d", "30m"),
            ("5d", "1h"),
        ]
    return [(period, interval)]

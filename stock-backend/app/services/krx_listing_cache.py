"""KRX 전종목 시가총액·상장주식수 (FinanceDataReader StockListing) — TTL 캐시."""

from __future__ import annotations

import io
import json
import logging
import math
import threading
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta

import FinanceDataReader as fdr
import httpx
import pandas as pd

logger = logging.getLogger(__name__)

_CACHE_TTL_SEC = 30 * 60
_KRX_LISTING_MIN_VALID_MARCAP_RATIO = 0.5
_KRX_GITHUB_LISTING_BASE = (
    "https://raw.githubusercontent.com/FinanceData/fdr_krx_data_cache/refs/heads/master/data/listing/krx"
)


@dataclass(frozen=True)
class KrxFundamentals:
    market_cap: float
    shares: float


_lock = threading.Lock()
_loaded_at: float = 0.0
_by_code: dict[str, KrxFundamentals] = {}
_names_by_code: dict[str, str] = {}


def _finite_non_negative(value: object) -> float:
    try:
        n = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(n) or n < 0:
        return 0.0
    return n


def _marcap_valid_ratio(df: pd.DataFrame | None) -> float:
    if df is None or df.empty or "Marcap" not in df.columns:
        return 0.0
    marcap = pd.Series(pd.to_numeric(df["Marcap"], errors="coerce"))
    valid_count = int(((marcap.notna()) & (marcap > 0)).sum())
    return valid_count / max(len(df), 1)


def _krx_max_work_date() -> date:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://data.krx.co.kr/contents/MDC/MDI/outerLoader/index.cmd",
    }
    url = (
        "http://data.krx.co.kr/comm/bldAttendant/executeForResourceBundle.cmd"
        "?baseName=krx.mdc.i18n.component&key=B128.bld"
    )
    try:
        resp = httpx.get(url, headers=headers, timeout=15.0)
        resp.raise_for_status()
        date_str = json.loads(resp.text)["result"]["output"][0]["max_work_dt"]
        return date(int(date_str[:4]), int(date_str[4:6]), int(date_str[6:8]))
    except Exception as exc:
        logger.debug("KRX max_work_dt lookup failed: %s", exc)
        return datetime.now().date()


def _fetch_github_krx_listing() -> pd.DataFrame | None:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    anchor = _krx_max_work_date()
    for offset in range(15):
        day = anchor - timedelta(days=offset)
        csv_url = f"{_KRX_GITHUB_LISTING_BASE}/{day:%Y-%m-%d}.csv"
        try:
            resp = httpx.get(csv_url, headers=headers, timeout=20.0)
            resp.raise_for_status()
            df = pd.read_csv(
                io.BytesIO(resp.content),
                dtype={"Code": str, "Dept": str, "ChangeCode": str, "MarketId": str},
            )
        except Exception:
            continue
        ratio = _marcap_valid_ratio(df)
        if ratio >= _KRX_LISTING_MIN_VALID_MARCAP_RATIO:
            logger.info("KRX listing GitHub fallback: %s (Marcap ratio %.2f)", day, ratio)
            return df
    return None


def _load_listing_df() -> pd.DataFrame | None:
    df: pd.DataFrame | None = None
    try:
        df = fdr.StockListing("KRX")
    except Exception as exc:
        logger.warning("FDR StockListing(KRX) failed: %s", exc)

    if df is not None and not df.empty:
        ratio = _marcap_valid_ratio(df)
        if ratio >= _KRX_LISTING_MIN_VALID_MARCAP_RATIO:
            return df
        logger.warning(
            "FDR KRX listing Marcap sparse (ratio %.2f); trying GitHub cache fallback",
            ratio,
        )

    fallback = _fetch_github_krx_listing()
    if fallback is not None and not fallback.empty:
        return fallback
    return df


def _load() -> dict[str, KrxFundamentals]:
    global _loaded_at, _by_code, _names_by_code
    now = time.monotonic()
    if _by_code and now - _loaded_at < _CACHE_TTL_SEC:
        return _by_code

    with _lock:
        now = time.monotonic()
        if _by_code and now - _loaded_at < _CACHE_TTL_SEC:
            return _by_code
        out: dict[str, KrxFundamentals] = {}
        names: dict[str, str] = {}
        try:
            df = _load_listing_df()
            if df is not None and not df.empty:
                for _, row in df.iterrows():
                    code = str(row.get("Code") or "").strip()
                    if not code:
                        continue
                    code6 = code.zfill(6)
                    listing_name = str(row.get("Name") or "").strip()
                    if listing_name:
                        names[code6] = listing_name
                        names[code] = listing_name
                    mcap = _finite_non_negative(row.get("Marcap"))
                    shares = _finite_non_negative(row.get("Stocks"))
                    if mcap <= 0 and shares <= 0:
                        continue
                    out[code] = KrxFundamentals(market_cap=mcap, shares=shares)
        except Exception as exc:
            logger.warning("KRX listing load failed: %s", exc)
            if _by_code:
                return _by_code
            return out

        _by_code = out
        if names:
            _names_by_code = names
        _loaded_at = now
        return _by_code


def get_krx_company_name(symbol: str) -> str | None:
    code = str(symbol or "").strip()
    if not code:
        return None
    _load()
    return _names_by_code.get(code.zfill(6)) or _names_by_code.get(code)


def get_krx_fundamentals(symbol: str) -> KrxFundamentals | None:
    code = str(symbol or "").strip()
    if not code:
        return None
    return _load().get(code)


def apply_krx_mcap_to_rows(rows: list[dict]) -> None:
    """참고 시드·Yahoo-only 행에 KRX Marcap 병합 (동기, listing 캐시)."""
    _load()
    for row in rows:
        sym = str(row.get("symbol") or "").strip()
        if not sym:
            continue
        fund = _by_code.get(sym)
        if not fund:
            continue
        mcap = _finite_non_negative(fund.market_cap)
        if mcap <= 0 and fund.shares > 0:
            try:
                price = float(row.get("price") or 0)
                if price > 0:
                    mcap = price * fund.shares
            except (TypeError, ValueError):
                mcap = 0.0
        if mcap > 0:
            row["market_cap"] = round(mcap, 2)

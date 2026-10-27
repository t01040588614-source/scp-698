"""Yahoo Finance 일괄 조회 — fast_info(장중 현재가) 우선, 일봉 fallback."""

from __future__ import annotations

import logging
import time
from typing import Any

import yfinance as yf

logger = logging.getLogger(__name__)


def _fi_get(fi: Any, *keys: str) -> float | None:
    for key in keys:
        val = None
        try:
            val = getattr(fi, key, None)
        except Exception:
            val = None
        if val is None and hasattr(fi, "get"):
            try:
                val = fi.get(key)
            except Exception:
                val = None
        if val is not None:
            try:
                f = float(val)
                if f > 0:
                    return f
            except (TypeError, ValueError):
                continue
    return None


def _patch_from_ticker(
    ticker: yf.Ticker,
    sym: str,
    *,
    allow_info_fallback: bool = True,
) -> dict | None:
    try:
        fi = ticker.fast_info
        price = _fi_get(fi, "last_price", "lastPrice", "regular_market_price", "regularMarketPrice")
        prev = _fi_get(fi, "previous_close", "previousClose", "regular_market_previous_close")
        if price is None and allow_info_fallback:
            info = ticker.info or {}
            for k in ("regularMarketPrice", "currentPrice"):
                try:
                    p = float(info.get(k) or 0)
                    if p > 0:
                        price = p
                        break
                except (TypeError, ValueError):
                    pass
        if prev is None and allow_info_fallback:
            info = getattr(ticker, "info", None) or {}
            try:
                p = float(info.get("regularMarketPreviousClose") or info.get("previousClose") or 0)
                if p > 0:
                    prev = p
            except (TypeError, ValueError):
                pass
        if price is None or price <= 0:
            return None
        if prev is None or prev <= 0:
            prev = price
        change = price - prev
        pct = (change / prev * 100) if prev else 0.0
        vol = 0
        try:
            vol = int(
                _fi_get(
                    fi,
                    "last_volume",
                    "lastVolume",
                    "regular_market_volume",
                    "regularMarketVolume",
                )
                or 0
            )
        except (TypeError, ValueError):
            vol = 0
        if vol <= 0 and allow_info_fallback:
            try:
                info = getattr(ticker, "info", None) or {}
                vol = int(info.get("regularMarketVolume") or info.get("volume") or 0)
            except (TypeError, ValueError):
                vol = 0
        market_cap = 0.0
        pe_ratio = 0.0
        try:
            mcap_raw = getattr(fi, "market_cap", None)
            if mcap_raw is not None:
                market_cap = float(mcap_raw)
        except (TypeError, ValueError):
            market_cap = 0.0
        eps = 0.0
        if allow_info_fallback and (market_cap <= 0 or pe_ratio <= 0):
            try:
                info = getattr(ticker, "info", None) or {}
                if market_cap <= 0:
                    market_cap = float(info.get("marketCap") or 0)
                pe_raw = info.get("trailingPE") or info.get("forwardPE")
                if pe_raw is not None:
                    pe_ratio = float(pe_raw)
                eps_raw = info.get("trailingEps") or info.get("epsTrailingTwelveMonths")
                if eps_raw is not None:
                    eps = float(eps_raw)
            except (TypeError, ValueError):
                pass
        return {
            "symbol": sym,
            "price": round(price, 4 if price < 50 and sym.endswith(("=X",)) else 2),
            "change": round(change, 4 if abs(change) < 10 else 2),
            "change_percent": round(pct, 2),
            "volume": vol,
            "market_cap": round(market_cap, 2) if market_cap > 0 else 0.0,
            "pe_ratio": round(pe_ratio, 2) if pe_ratio > 0 else 0.0,
            "eps": round(eps, 4) if eps else 0.0,
            "high": round(price, 2),
            "low": round(price, 2),
            "open": round(price, 2),
            "previous_close": round(prev, 4 if prev < 50 else 2),
        }
    except Exception as exc:
        logger.debug("fast_info failed for %s: %s", sym, exc)
        return None


def _parse_download_daily(
    df,
    yahoo_to_symbol: dict[str, str],
) -> dict[str, dict]:
    out: dict[str, dict] = {}
    if df is None or df.empty:
        return out

    if len(yahoo_to_symbol) == 1:
        yahoo = next(iter(yahoo_to_symbol))
        sym = yahoo_to_symbol[yahoo]
        if len(df) < 1:
            return out
        row = df.iloc[-1]
        prev_row = df.iloc[-2] if len(df) >= 2 else row
        close = float(row["Close"])
        prev = float(prev_row["Close"])
        if close <= 0:
            return out
        change = close - prev
        pct = (change / prev * 100) if prev else 0.0
        out[sym] = {
            "symbol": sym,
            "price": round(close, 2),
            "change": round(change, 2),
            "change_percent": round(pct, 2),
            "volume": int(row.get("Volume", 0) or 0),
            "high": float(row.get("High", close) or close),
            "low": float(row.get("Low", close) or close),
            "open": float(row.get("Open", close) or close),
            "previous_close": round(prev, 2),
        }
        return out

    for yahoo, sym in yahoo_to_symbol.items():
        try:
            if yahoo not in df.columns.get_level_values(0):
                continue
            sub = df[yahoo].dropna(how="all")
            if len(sub) < 1:
                continue
            row = sub.iloc[-1]
            prev_row = sub.iloc[-2] if len(sub) >= 2 else row
            close = float(row["Close"])
            prev = float(prev_row["Close"])
            if close <= 0:
                continue
            change = close - prev
            pct = (change / prev * 100) if prev else 0.0
            out[sym] = {
                "symbol": sym,
                "price": round(close, 2),
                "change": round(change, 2),
                "change_percent": round(pct, 2),
                "volume": int(row.get("Volume", 0) or 0),
                "high": float(row.get("High", close) or close),
                "low": float(row.get("Low", close) or close),
                "open": float(row.get("Open", close) or close),
                "previous_close": round(prev, 2),
            }
        except Exception:
            continue
    return out


def _fetch_daily_fallback(mapping: dict[str, str]) -> dict[str, dict]:
    tickers = " ".join(mapping.keys())
    try:
        df = yf.download(
            tickers,
            period="5d",
            interval="1d",
            group_by="ticker",
            threads=False,
            progress=False,
            auto_adjust=False,
        )
        return _parse_download_daily(df, mapping)
    except Exception as exc:
        logger.debug("daily fallback failed: %s", exc)
        return {}


def _chunked_daily_batch(
    yahoo_to_symbol: dict[str, str],
    chunk_size: int,
    pause_sec: float,
) -> dict[str, dict]:
    items = list(yahoo_to_symbol.items())
    merged: dict[str, dict] = {}
    for i in range(0, len(items), chunk_size):
        merged.update(_fetch_daily_fallback(dict(items[i : i + chunk_size])))
        if i + chunk_size < len(items):
            time.sleep(pause_sec)
    return merged


def fetch_yahoo_live_batch(
    yahoo_to_symbol: dict[str, str],
    chunk_size: int = 24,
    pause_sec: float = 0.35,
) -> dict[str, dict]:
    """Yahoo fast_info 기반 현재가 (장중·해외 실시간에 가깝게)."""
    items = list(yahoo_to_symbol.items())
    merged: dict[str, dict] = {}
    for i in range(0, len(items), chunk_size):
        chunk = items[i : i + chunk_size]
        mapping = dict(chunk)
        tickers_str = " ".join(mapping.keys())
        try:
            bundle = yf.Tickers(tickers_str)
            for yahoo, sym in mapping.items():
                t = bundle.tickers.get(yahoo)
                if t is None:
                    continue
                allow_fb = not (yahoo.startswith("^") or "=X" in yahoo)
                patch = _patch_from_ticker(t, sym, allow_info_fallback=allow_fb)
                if patch:
                    merged[sym] = patch
        except Exception as exc:
            logger.warning("Yahoo live batch chunk failed: %s", exc)
        if i + chunk_size < len(items):
            time.sleep(pause_sec)

    missing = {y: s for y, s in yahoo_to_symbol.items() if s not in merged}
    if missing:
        for j in range(0, len(missing.items()), chunk_size):
            sub_items = list(missing.items())[j : j + chunk_size]
            merged.update(_fetch_daily_fallback(dict(sub_items)))
            if j + chunk_size < len(missing):
                time.sleep(pause_sec)
    return merged


def fetch_yahoo_batch(
    yahoo_to_symbol: dict[str, str],
    chunk_size: int = 28,
    pause_sec: float = 0.35,
) -> dict[str, dict]:
    """yahoo 티커 → symbol 매핑. 소량은 live, 대량은 daily(429·타임아웃 완화)."""
    if not yahoo_to_symbol:
        return {}
    n = len(yahoo_to_symbol)
    if n > 25:
        daily = _chunked_daily_batch(
            yahoo_to_symbol,
            chunk_size=min(chunk_size, 20),
            pause_sec=max(pause_sec, 0.75),
        )
        if len(daily) >= max(1, n // 3):
            return daily
        missing = {y: s for y, s in yahoo_to_symbol.items() if s not in daily}
        if missing:
            daily.update(
                fetch_yahoo_live_batch(
                    missing,
                    chunk_size=min(16, chunk_size),
                    pause_sec=max(pause_sec, 0.6),
                )
            )
        return daily
    return fetch_yahoo_live_batch(yahoo_to_symbol, chunk_size=chunk_size, pause_sec=pause_sec)


def fetch_us_symbols(symbols: list[str], chunk_size: int = 28) -> dict[str, dict]:
    mapping = {s.upper(): s.upper() for s in symbols}
    return fetch_yahoo_batch(mapping, chunk_size=chunk_size)

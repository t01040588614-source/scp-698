"""한국 종목 PER·EPS·시총(Yahoo .KS/.KQ) — FDR-only 경로 보강, TTL 캐시."""

from __future__ import annotations

import asyncio
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from app.data.korea_universe import KOREA_UNIVERSE
from app.services.stock_providers.yahoo_batch import fetch_yahoo_batch

logger = logging.getLogger(__name__)

_CACHE_TTL_SEC = 6 * 60 * 60
_executor = ThreadPoolExecutor(max_workers=1)
_lock = threading.Lock()
_loaded_at: float = 0.0
_by_symbol: dict[str, dict[str, float]] = {}


def _yahoo_map() -> dict[str, str]:
    return {m["yahoo"]: m["symbol"] for m in KOREA_UNIVERSE}


def _load_sync() -> dict[str, dict[str, float]]:
    global _loaded_at, _by_symbol
    now = time.monotonic()
    if _by_symbol and now - _loaded_at < _CACHE_TTL_SEC:
        return _by_symbol

    with _lock:
        now = time.monotonic()
        if _by_symbol and now - _loaded_at < _CACHE_TTL_SEC:
            return _by_symbol
        out: dict[str, dict[str, float]] = {}
        try:
            patches = fetch_yahoo_batch(_yahoo_map(), chunk_size=14, pause_sec=0.65)
            for sym, patch in patches.items():
                row: dict[str, float] = {}
                mcap = float(patch.get("market_cap") or 0)
                pe = float(patch.get("pe_ratio") or 0)
                eps = float(patch.get("eps") or 0)
                if mcap > 0:
                    row["market_cap"] = mcap
                if pe > 0:
                    row["pe_ratio"] = pe
                if eps != 0:
                    row["eps"] = eps
                if row:
                    out[sym] = row
        except Exception as exc:
            logger.warning("Korea valuation batch failed: %s", exc)
            if _by_symbol:
                return _by_symbol
            return out

        _by_symbol = out
        _loaded_at = now
        return _by_symbol


def apply_valuation_to_rows(rows: list[dict]) -> None:
    """캐시에 있을 때만 병합 — refresh 경로에서 Yahoo 전량 조회로 블로킹하지 않음."""
    cache = _by_symbol
    if not cache:
        return
    for row in rows:
        sym = row.get("symbol")
        if not sym:
            continue
        val = cache.get(sym)
        if not val:
            continue
        if (not row.get("market_cap") or float(row.get("market_cap") or 0) <= 0) and val.get(
            "market_cap"
        ):
            row["market_cap"] = val["market_cap"]
        if (not row.get("pe_ratio") or float(row.get("pe_ratio") or 0) <= 0) and val.get(
            "pe_ratio"
        ):
            row["pe_ratio"] = val["pe_ratio"]
        if (not row.get("eps") or float(row.get("eps") or 0) == 0) and val.get("eps"):
            row["eps"] = val["eps"]


async def apply_valuation_to_rows_async(rows: list[dict]) -> None:
    if not rows:
        return
    apply_valuation_to_rows(rows)


async def warm_valuation_cache_async() -> None:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, _load_sync)


def merge_korea_fundamentals(base: dict | None, live: dict) -> dict:
    """FDR 시총 + Yahoo(또는 FDR) 시세 병합."""
    merged = {**(base or {}), **live}
    if base:
        for key in ("market_cap", "pe_ratio", "eps"):
            live_val = merged.get(key) or 0
            base_val = base.get(key) or 0
            if (not live_val or live_val == 0) and base_val:
                merged[key] = base_val
    return merged

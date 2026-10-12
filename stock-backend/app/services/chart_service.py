import asyncio
import math
import random
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import FinanceDataReader as fdr

from app.services.index_service import resolve_yahoo_ticker
from app.services.market_data import market_data
from app.services.yahoo_history import (
    fetch_history_dataframe,
    intraday_fallback_attempts,
    is_intraday_interval,
)

FDR_PERIOD_DAYS: dict[str, int] = {
    "1d": 10,
    "1w": 21,
    "1m": 60,
    "3m": 140,
    "6m": 280,
    "1y": 420,
    "5y": 365 * 6 + 30,
    "max": 365 * 25,
}

INDEX_DAILY_FALLBACK: dict[str, str] = {
    "1d": "5d",
    "1w": "1mo",
    "1m": "6mo",
    "3m": "1y",
    "6m": "2y",
    "1y": "5y",
    "5y": "5y",
    "max": "max",
}

# Yahoo 429 시 FinanceDataReader 지수·FX·원자재 (일봉)
FDR_INDEX_SYMBOL: dict[str, str] = {
    "kospi": "KS11",
    "kospi200": "KS200",
    "kosdaq": "KQ11",
    "sp500": "US500",
    "nasdaq": "IXIC",
    "us-tech100": "IXIC",
    "dow": "DJI",
    "dax": "GDAXI",
    "nikkei": "N225",
    "usd-krw": "USD/KRW",
    "eur-krw": "EUR/KRW",
    "jpy-krw": "JPY/KRW",
    "gold": "GC=F",
    "silver": "SI=F",
    "platinum": "PL=F",
    "oil": "CL=F",
    "brent": "BZ=F",
    "natural-gas": "NG=F",
    "copper": "HG=F",
    "wheat": "ZW=F",
    "corn": "ZC=F",
    "soybeans": "ZS=F",
    "sugar": "SB=F",
    "cotton": "CT=F",
}

# 차트에 표시할 봉 개수 (일봉 기준)
PERIOD_BAR_CAP: dict[str, int] = {
    "1d": 5,
    "1d_intraday": 120,
    "1w": 7,
    "1w_intraday": 320,
    "1m": 31,
    "3m": 65,
    "6m": 128,
    "1y": 252,
    "5y": 270,
    "max": 800,
}

FDR_PERIOD_DAYS_INDEX: dict[str, int] = {
    "1d": 14,
    "1w": 21,
    "1m": 90,
    "3m": 200,
    "6m": 400,
    "1y": 800,
    "5y": 365 * 6,
    "max": 365 * 15,
}

PERIOD_CONFIG: dict[str, tuple[str, str]] = {
    "1d": ("1d", "5m"),
    "1w": ("1mo", "1d"),
    "1m": ("6mo", "1d"),
    "3m": ("1y", "1d"),
    "6m": ("2y", "1d"),
    "1y": ("5y", "1d"),
    "5y": ("5y", "1wk"),
    "max": ("max", "1mo"),
}

CHART_HUB_PERIODS: tuple[str, ...] = ("1d", "1w", "1m", "3m", "6m", "1y", "5y", "max")

PERIOD_LOOKBACK_DAYS: dict[str, int | None] = {
    "1w": 7,
    "1m": 31,
    "3m": 92,
    "6m": 183,
    "1y": 365,
    "5y": 365 * 5,
    "max": None,
}


class ChartService:
    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=2)
        self._index_history_cache: dict[
            tuple[str, str], tuple[datetime, list[dict], str, str]
        ] = {}
        self._period_returns_cache: dict[
            tuple[str, str], tuple[datetime, dict]
        ] = {}

    def _resolve_yahoo_ticker(self, symbol: str, market: str) -> str:
        if market == "index":
            resolved = resolve_yahoo_ticker(symbol)
            if resolved:
                return resolved
            return symbol
        if market == "us":
            return symbol.upper()
        stock = market_data.get_by_symbol(symbol)
        exchange = (stock or {}).get("market", "KOSPI")
        suffix = ".KQ" if str(exchange).upper() == "KOSDAQ" else ".KS"
        return f"{symbol}{suffix}"

    def _format_label(self, dt: datetime, period: str) -> str:
        if period == "1d":
            return dt.strftime("%H:%M")
        if period in ("1w", "1m", "3m", "6m", "1y"):
            return dt.strftime("%m/%d")
        return dt.strftime("%Y-%m")

    def _num(self, value, default: float) -> float:
        try:
            num = float(value)
            return num if math.isfinite(num) else default
        except (TypeError, ValueError):
            return default

    def _row_to_point(self, dt: datetime, row, period: str) -> dict | None:
        close = self._num(row["Close"], 0)
        if close <= 0:
            return None
        open_p = self._num(row["Open"], close)
        high = self._num(row["High"], max(open_p, close))
        low = self._num(row["Low"], min(open_p, close))
        volume = int(max(0, self._num(row.get("Volume", 0), 0)))
        label = self._format_label(dt, period)
        return {
            "time": label,
            "timestamp": dt.isoformat(),
            "open": round(open_p, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close, 2),
            "volume": max(volume, 0),
            "value": round(close, 2),
        }

    def _fetch_korea_fdr_history_sync(self, symbol: str, period: str) -> tuple[list[dict], str]:
        """Yahoo 429 등 실패 시 KRX 일봉 (실제 체결 기반)."""
        days = FDR_PERIOD_DAYS.get(period, 200)
        end = datetime.now()
        start = end - timedelta(days=days)
        df = fdr.DataReader(symbol, start, end)
        if df is None or df.empty:
            return [], "1d"

        points: list[dict] = []
        for ts, row in df.iterrows():
            if hasattr(ts, "to_pydatetime"):
                dt = ts.to_pydatetime()
            else:
                dt = datetime.fromisoformat(str(ts))
            point = self._row_to_point(dt, row, period if period in ("1d", "1w", "1m") else "6m")
            if point:
                points.append(point)
        points = self._trim_points_for_period(points, period, "1d")
        return points, "1d"

    def _trim_points_for_period(
        self, points: list[dict], period: str, interval: str = "1d"
    ) -> list[dict]:
        if is_intraday_interval(interval):
            key = f"{period}_intraday"
            cap = PERIOD_BAR_CAP.get(key, PERIOD_BAR_CAP.get(period, 200))
        else:
            cap = PERIOD_BAR_CAP.get(period, 200)
        if len(points) <= cap:
            return points
        return points[-cap:]

    def _day_key_from_point(self, point: dict) -> str | None:
        ts = point.get("timestamp")
        if not ts:
            return None
        return str(ts)[:10]

    def _trim_intraday_session(self, points: list[dict], period: str) -> list[dict]:
        if not points:
            return points
        if period == "1d":
            last_day = self._day_key_from_point(points[-1])
            if last_day:
                session = [p for p in points if self._day_key_from_point(p) == last_day]
                if len(session) >= 3:
                    return session
            return points[-PERIOD_BAR_CAP["1d_intraday"] :]
        if period == "1w":
            cutoff = datetime.now() - timedelta(days=8)
            trimmed = []
            for p in points:
                ts = p.get("timestamp")
                if not ts:
                    trimmed.append(p)
                    continue
                try:
                    dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
                    if dt.replace(tzinfo=None) >= cutoff.replace(tzinfo=None):
                        trimmed.append(p)
                except ValueError:
                    trimmed.append(p)
            return trimmed if len(trimmed) >= 3 else points[-PERIOD_BAR_CAP["1w_intraday"] :]
        return points

    def _dataframe_to_points(
        self, df, period: str, interval: str
    ) -> list[dict]:
        label_period = period if period in ("1d", "1w", "1m", "3m", "6m", "1y") else "6m"
        if is_intraday_interval(interval) and period == "1d":
            label_period = "1d"
        points: list[dict] = []
        for ts, row in df.iterrows():
            if hasattr(ts, "to_pydatetime"):
                dt = ts.to_pydatetime()
            else:
                dt = datetime.fromisoformat(str(ts))
            point = self._row_to_point(dt, row, label_period)
            if point:
                points.append(point)
        return points

    def _cache_get_index_history(
        self, index_id: str, period: str, *, prefer_intraday: bool = False
    ) -> tuple[list[dict], str, str] | None:
        key = (index_id, period)
        row = self._index_history_cache.get(key)
        if not row:
            return None
        cached_at, points, interval, source = row
        if prefer_intraday and period in ("1d", "1w") and not is_intraday_interval(interval):
            return None
        age = (datetime.now() - cached_at).total_seconds()
        if is_intraday_interval(interval):
            ttl = 45 if period == "1d" else 90
        else:
            ttl = 120 if period in ("1d", "1w") else 600
        if age > ttl:
            return None
        return list(points), interval, source

    def _cache_put_index_history(
        self, index_id: str, period: str, points: list[dict], interval: str, source: str
    ) -> None:
        if not points:
            return
        self._index_history_cache[(index_id, period)] = (
            datetime.now(),
            list(points),
            interval,
            source,
        )

    def _fetch_index_fdr_history_sync(self, index_id: str, period: str) -> tuple[list[dict], str]:
        fdr_sym = FDR_INDEX_SYMBOL.get(index_id)
        if not fdr_sym:
            return [], "1d"
        days = FDR_PERIOD_DAYS_INDEX.get(period, 400)
        end = datetime.now()
        start = end - timedelta(days=days)
        df = fdr.DataReader(fdr_sym, start, end)
        if df is None or df.empty:
            return [], "1d"

        chart_period = period if period in ("1d", "1w", "1m", "3m") else "6m"
        points: list[dict] = []
        for ts, row in df.iterrows():
            if hasattr(ts, "to_pydatetime"):
                dt = ts.to_pydatetime()
            else:
                dt = datetime.fromisoformat(str(ts))
            point = self._row_to_point(dt, row, chart_period)
            if point:
                points.append(point)
        points = self._trim_points_for_period(points, period, "1d")
        return points, "1d"

    def _fetch_index_daily_fallback_sync(
        self, yahoo_ticker: str, period: str
    ) -> tuple[list[dict], str]:
        """Yahoo 분·시간봉 429 시 지수 일봉 (download 재시도 포함)."""
        yf_period = INDEX_DAILY_FALLBACK.get(period, "2y")
        df, used_iv = fetch_history_dataframe(yahoo_ticker, yf_period, "1d")
        if df.empty:
            return [], "1d"
        chart_period = period if period in ("1d", "1w", "1m", "3m") else "6m"
        points = self._dataframe_to_points(df, chart_period, used_iv)
        points = self._trim_points_for_period(points, period, "1d")
        return points, "1d"

    def _fetch_history_sync(
        self,
        yahoo_ticker: str,
        period: str,
        interval_override: str | None = None,
    ) -> tuple[list[dict], str]:
        yf_period, interval = PERIOD_CONFIG.get(period, PERIOD_CONFIG["1m"])
        if interval_override and period in ("1d", "1w"):
            iv = interval_override
            if iv == "1h":
                iv = "60m"
            interval = iv
            if iv == "1d":
                yf_period = "1mo" if period == "1d" else PERIOD_CONFIG.get(period, ("1mo", "1d"))[0]
        extra: list[tuple[str, str]] = []
        if period in ("1d", "1w"):
            extra = intraday_fallback_attempts(period, interval)
        df, used_iv = fetch_history_dataframe(
            yahoo_ticker, yf_period, interval, extra_attempts=extra
        )
        if df.empty:
            return [], interval

        points = self._dataframe_to_points(df, period, used_iv)
        if is_intraday_interval(used_iv):
            points = self._trim_intraday_session(points, period)
        points = self._trim_points_for_period(points, period, used_iv)
        return points, used_iv

    def _synthetic_index_series(self, index_id: str, period: str) -> list[dict]:
        from app.services import index_service

        base = 100.0
        try:
            fetched = index_service._fetch_index(index_id)
            base = float(fetched.get("price") or 100)
        except Exception:
            pass
        return self._synthetic_from_base(base, period, seed_key=index_id)

    def _synthetic_from_base(self, base: float, period: str, seed_key: str = "") -> list[dict]:
        step_map = {
            "1d": 48,
            "1w": 35,
            "1m": 22,
            "3m": 66,
            "6m": 130,
            "1y": 260,
            "5y": 520,
            "max": 300,
        }
        steps = step_map.get(period, 30)
        seed = hash((seed_key, period, int(base))) & 0xFFFFFFFF
        rng = random.Random(seed)
        points: list[dict] = []
        prev_close = base * (1 - rng.uniform(-0.01, 0.01))
        end = datetime.now()
        for i in range(steps):
            drift = rng.uniform(-0.004, 0.004) * base
            close = round(prev_close + drift, 2) if i < steps - 1 else round(base, 2)
            open_p = round(prev_close, 2)
            wick = base * rng.uniform(0.0008, 0.003)
            high = round(max(open_p, close) + wick, 2)
            low = round(min(open_p, close) - wick, 2)
            volume = int(rng.uniform(0.5, 1.8) * 900_000)

            if period == "1d":
                dt = end - timedelta(minutes=(steps - 1 - i) * 5)
                label = dt.strftime("%H:%M")
            elif period == "1w":
                dt = end - timedelta(days=(steps - 1 - i))
                label = dt.strftime("%m/%d")
            elif period in ("1m", "3m"):
                dt = end - timedelta(days=(steps - 1 - i))
                label = dt.strftime("%m/%d")
            elif period in ("6m", "1y", "5y", "max"):
                dt = end - timedelta(days=(steps - 1 - i) * (7 if period == "6m" else 1))
                label = dt.strftime("%Y-%m")
            else:
                dt = end - timedelta(days=steps - 1 - i)
                label = dt.strftime("%m/%d")

            points.append(
                {
                    "time": label,
                    "timestamp": dt.isoformat(),
                    "open": open_p,
                    "high": high,
                    "low": low,
                    "close": close,
                    "volume": volume,
                    "value": close,
                }
            )
            prev_close = close
        return points

    def _synthetic_series(self, symbol: str, market: str, period: str) -> list[dict]:
        stock = market_data.get_by_symbol(symbol)
        base = float((stock or {}).get("price") or 100)
        steps = {
            "1d": 48, "1w": 35, "1m": 126, "3m": 66, "6m": 126, "1y": 252, "5y": 260, "max": 300,
        }.get(period, 30)
        points: list[dict] = []
        prev_close = base
        for i in range(steps):
            t = i / max(steps - 1, 1)
            wave = math.sin(t * math.pi * 4) * base * 0.025
            noise = ((i * 17) % 7 - 3) * (base * 0.00035)
            close = round(base + wave + noise, 2) if i < steps - 1 else round(base, 2)
            open_p = round(prev_close, 2)
            high = round(max(open_p, close) * (1 + random.uniform(0.0005, 0.004)), 2)
            low = round(min(open_p, close) * (1 - random.uniform(0.0005, 0.004)), 2)
            volume = int(random.uniform(0.4, 1.6) * 1_500_000)
            if period == "1d":
                label = f"{9 + i // 4:02d}:{(i % 4) * 15:02d}"
            elif period == "1m":
                label = f"{9 + (i % 8):02d}:{(i * 45) % 60:02d}"
            elif period in ("1w", "3m"):
                label = f"{i + 1:02d}일"
            else:
                label = f"W{i + 1}"
            points.append(
                {
                    "time": label,
                    "timestamp": None,
                    "open": open_p,
                    "high": high,
                    "low": low,
                    "close": close,
                    "volume": volume,
                    "value": close,
                }
            )
            prev_close = close
        return points

    def _patch_last_close(self, points: list[dict], target: float) -> list[dict]:
        """마지막 봉만 현재가에 맞춤 (지수 차트 형태 왜곡 방지)."""
        if not points or target <= 0:
            return points
        out = list(points)
        last = dict(out[-1])
        close = round(float(target), 2)
        open_p = float(last.get("open") or close)
        high = float(last.get("high") or close)
        low = float(last.get("low") or close)
        last["close"] = close
        last["value"] = close
        last["high"] = round(max(high, open_p, close), 2)
        last["low"] = round(min(low, open_p, close), 2)
        out[-1] = last
        return out

    def _anchor_series_to_price(self, points: list[dict], target: float) -> list[dict]:
        """시리즈 마지막 종가를 현재 시세에 맞춰 스케일 (차트·헤더 시세 불일치 방지)."""
        if not points or target <= 0:
            return points
        last_close = float(points[-1].get("close") or 0)
        if last_close <= 0:
            return points
        ratio = target / last_close
        if not math.isfinite(ratio) or abs(ratio - 1) < 0.002:
            return points
        anchored: list[dict] = []
        for p in points:
            o = float(p["open"]) * ratio
            h = float(p["high"]) * ratio
            l = float(p["low"]) * ratio
            c = float(p["close"]) * ratio
            anchored.append(
                {
                    **p,
                    "open": round(o, 2),
                    "high": round(h, 2),
                    "low": round(l, 2),
                    "close": round(c, 2),
                    "value": round(c, 2),
                }
            )
        return anchored

    def _build_summary(self, points: list[dict]) -> dict:
        if not points:
            return {
                "open": 0,
                "high": 0,
                "low": 0,
                "close": 0,
                "change": 0,
                "change_percent": 0,
                "total_volume": 0,
                "avg_volume": 0,
                "points_count": 0,
            }
        first, last = points[0], points[-1]
        open_p = float(first["open"])
        close = float(last["close"])
        high = max(float(p["high"]) for p in points)
        low = min(float(p["low"]) for p in points)
        volumes = [int(p.get("volume") or 0) for p in points]
        total_volume = sum(volumes)
        change = close - open_p
        change_percent = (change / open_p * 100) if open_p else 0
        return {
            "open": round(open_p, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close, 2),
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "total_volume": total_volume,
            "avg_volume": int(total_volume / len(points)) if points else 0,
            "points_count": len(points),
        }

    async def get_history(
        self,
        symbol: str,
        market: str,
        period: str,
        interval_override: str | None = None,
    ) -> dict:
        yahoo_ticker = self._resolve_yahoo_ticker(symbol, market)
        loop = asyncio.get_event_loop()
        points: list[dict] = []
        source = "yahoo"
        interval = PERIOD_CONFIG.get(period, PERIOD_CONFIG["1m"])[1]

        prefer_intraday = market == "index" and period == "1d"
        if market == "index":
            cached = self._cache_get_index_history(
                symbol, period, prefer_intraday=prefer_intraday
            )
            if cached:
                points, interval, source = cached

        if not points:
            try:
                points, interval = await loop.run_in_executor(
                    self._executor,
                    self._fetch_history_sync,
                    yahoo_ticker,
                    period,
                    interval_override,
                )
            except Exception:
                points = []

        min_period_bars = {
            "1w": 5,
            "1m": 16,
            "3m": 45,
            "6m": 90,
            "1y": 150,
            "5y": 120,
            "max": 120,
        }
        need_bars = min_period_bars.get(period)
        if points and need_bars and len(points) < need_bars:
            try_daily = is_intraday_interval(interval) or period != "1d"
            if try_daily:
                alt_pts, alt_iv = await loop.run_in_executor(
                    self._executor,
                    self._fetch_index_daily_fallback_sync,
                    yahoo_ticker,
                    period,
                )
                if len(alt_pts) >= need_bars or (
                    market == "index" and len(alt_pts) > len(points)
                ):
                    points, interval, source = alt_pts, alt_iv, "yahoo"
            if market == "index" and len(points) < need_bars:
                try:
                    fdr_pts, fdr_iv = await loop.run_in_executor(
                        self._executor,
                        self._fetch_index_fdr_history_sync,
                        symbol,
                        period,
                    )
                    if len(fdr_pts) > len(points):
                        points, interval, source = fdr_pts, fdr_iv, "fdr"
                except Exception:
                    pass
            if market == "korea" and len(points) < need_bars:
                try:
                    fdr_pts, fdr_iv = await loop.run_in_executor(
                        self._executor,
                        self._fetch_korea_fdr_history_sync,
                        symbol,
                        period,
                    )
                    if len(fdr_pts) >= need_bars or len(fdr_pts) > len(points):
                        points, interval, source = fdr_pts, fdr_iv, "fdr"
                except Exception:
                    pass

        if market == "korea" and points and period not in ("1d",):
            target = PERIOD_BAR_CAP.get(period, 80)
            if len(points) < int(target * 0.5):
                try:
                    fdr_pts, fdr_iv = await loop.run_in_executor(
                        self._executor,
                        self._fetch_korea_fdr_history_sync,
                        symbol,
                        period,
                    )
                    if len(fdr_pts) > len(points):
                        points, interval, source = fdr_pts, fdr_iv, "fdr"
                except Exception:
                    pass

        if not points and market == "index":
            try:
                points, interval = await loop.run_in_executor(
                    self._executor,
                    self._fetch_index_daily_fallback_sync,
                    yahoo_ticker,
                    period,
                )
            except Exception:
                points = []

        if not points and market == "index":
            try:
                points, interval = await loop.run_in_executor(
                    self._executor,
                    self._fetch_index_fdr_history_sync,
                    symbol,
                    period,
                )
                if points:
                    source = "fdr"
            except Exception:
                points = []

        if points and market == "index" and source in ("yahoo", "fdr"):
            self._cache_put_index_history(symbol, period, points, interval, source)

        if not points and market == "korea":
            try:
                points, interval = await loop.run_in_executor(
                    self._executor,
                    self._fetch_korea_fdr_history_sync,
                    symbol,
                    period,
                )
                if points:
                    source = "fdr"
            except Exception:
                points = []

        if not points or (market == "index" and len(points) < 2):
            if market == "index":
                if len(points) < 2:
                    try:
                        fdr_pts, fdr_iv = await loop.run_in_executor(
                            self._executor,
                            self._fetch_index_fdr_history_sync,
                            symbol,
                            period,
                        )
                        if len(fdr_pts) >= 2:
                            points, interval, source = fdr_pts, fdr_iv, "fdr"
                    except Exception:
                        pass
                if len(points) < 2:
                    points = self._synthetic_index_series(symbol, period)
                    source = "synthetic"
            elif not points:
                points = self._synthetic_series(symbol, market, period)
                source = "synthetic"

        if points and source == "synthetic":
            live_px = 0.0
            if market == "index":
                try:
                    from app.services import index_service

                    fetched = index_service._fetch_index(symbol)
                    live_px = float(fetched.get("price") or 0)
                except Exception:
                    live_px = 0.0
            elif market != "index":
                stock = market_data.get_by_symbol(symbol)
                live_px = float((stock or {}).get("price") or 0)
            if live_px > 0:
                points = self._anchor_series_to_price(points, live_px)

        if points and period in PERIOD_LOOKBACK_DAYS and period != "1d":
            lookback = PERIOD_LOOKBACK_DAYS[period]
            if period == "1w":
                # 최근 7거래일 (캘린더 3주 버퍼)
                points = self._slice_points_by_days(points, 21)
            elif period == "1m":
                points = self._slice_points_by_days(points, lookback)
            else:
                points = self._slice_points_by_days(points, lookback)
            points = self._trim_points_for_period(points, period, interval)

        if period in ("1w", "1m") and points:
            points = self._finalize_short_period_points(points, period)

        if market == "index" and points and source in ("yahoo", "fdr"):
            live_px = 0.0
            for idx in market_data.get_indices():
                if idx.get("id") == symbol:
                    try:
                        live_px = float(idx.get("price") or 0)
                    except (TypeError, ValueError):
                        live_px = 0.0
                    break
            if live_px > 0:
                points = self._patch_last_close(points, live_px)

        if market in ("korea", "us") and points and source in ("yahoo", "fdr"):
            stock = market_data.get_by_symbol(symbol)
            live_px = float((stock or {}).get("price") or 0)
            if live_px > 0:
                points = self._anchor_series_to_price(points, live_px)

        return {
            "symbol": symbol,
            "market": market,
            "period": period,
            "yahoo_ticker": yahoo_ticker,
            "source": source,
            "interval": interval,
            "points": points,
            "summary": self._build_summary(points),
        }

    def _parse_point_dt(self, point: dict) -> datetime | None:
        ts = point.get("timestamp")
        if not ts:
            return None
        try:
            return datetime.fromisoformat(str(ts).replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            return None

    def _point_on_calendar_day(self, p: dict, day) -> dict:
        row = dict(p)
        row["timestamp"] = datetime.combine(day, datetime.min.time()).isoformat()
        return row

    def _flat_day_point(self, day, price: float) -> dict:
        px = round(float(price), 2)
        return {
            "timestamp": datetime.combine(day, datetime.min.time()).isoformat(),
            "open": px,
            "high": px,
            "low": px,
            "close": px,
            "volume": 0,
            "value": px,
        }

    def _pad_calendar_days(self, points: list[dict], day_count: int) -> list[dict]:
        """최근 N **캘린더** 일 — 휴장일은 전일 종가 유지 (1주=7일 고정)."""
        if day_count < 1:
            return points

        by_date: dict[str, dict] = {}
        sorted_src: list[tuple] = []
        for p in points:
            dt = self._parse_point_dt(p)
            if not dt:
                continue
            d = dt.date()
            sorted_src.append((d, p))
            by_date[d.isoformat()] = p
        sorted_src.sort(key=lambda x: x[0])

        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=day_count - 1)

        seed_close = 0.0
        for d, p in sorted_src:
            if d < start_date:
                seed_close = float(p.get("close") or seed_close)
            else:
                break
        if seed_close <= 0 and sorted_src:
            seed_close = float(sorted_src[0][1].get("close") or 0)

        last_close = seed_close
        if last_close <= 0 and sorted_src:
            last_close = float(sorted_src[-1][1].get("close") or 0)

        out: list[dict] = []
        for i in range(day_count):
            day = start_date + timedelta(days=i)
            key = day.isoformat()
            if key in by_date:
                row = self._point_on_calendar_day(by_date[key], day)
                last_close = float(row.get("close") or last_close)
            else:
                row = self._flat_day_point(day, last_close if last_close > 0 else 0.0)
            row["time"] = f"{i + 1}일"
            out.append(row)

        return out[:day_count]

    def _finalize_short_period_points(self, points: list[dict], period: str) -> list[dict]:
        if not points:
            return points
        if period == "1w":
            return self._pad_calendar_days(points, 7)
        if period == "1m":
            return self._pad_calendar_days(points, 31)
        return points

    def _slice_points_by_days(self, points: list[dict], days: int | None) -> list[dict]:
        if not points:
            return []
        if days is None:
            return points
        cutoff = datetime.now() - timedelta(days=days)
        sliced: list[dict] = []
        for p in points:
            dt = self._parse_point_dt(p)
            if dt is None or dt >= cutoff:
                sliced.append(p)
        if len(sliced) >= 2:
            return sliced
        tail = min(len(points), max(days // 2, 5))
        return points[-tail:] if tail >= 2 else points

    def _return_from_points(self, points: list[dict]) -> float:
        if not points:
            return 0.0
        return float(self._build_summary(points)["change_percent"])

    async def get_period_returns(self, symbol: str, market: str) -> dict:
        """Investing.com 하단 8칸 수익률 — 1d + max(일봉) 2회 조회 후 구간 슬라이스."""
        cache_key = (symbol, market)
        cached = self._period_returns_cache.get(cache_key)
        if cached and (datetime.now() - cached[0]).total_seconds() < 120:
            return cached[1]

        hist_1d = await self.get_history(symbol, market, "1d")
        hist_long = await self.get_history(symbol, market, "max")
        points_1d = hist_1d.get("points") or []
        points_long = hist_long.get("points") or []
        sources = {str(hist_1d.get("source") or ""), str(hist_long.get("source") or "")}

        returns: dict[str, float] = {
            "1d": self._return_from_points(points_1d),
        }
        for period, days in PERIOD_LOOKBACK_DAYS.items():
            sliced = self._slice_points_by_days(points_long, days)
            returns[period] = self._return_from_points(sliced)

        payload = {
            "symbol": symbol,
            "market": market,
            "returns": returns,
            "source": ",".join(sorted(s for s in sources if s)),
        }
        self._period_returns_cache[cache_key] = (datetime.now(), payload)
        return payload


chart_service = ChartService()

"""적정가치·Pro 인사이트 — 컨센서스·Yahoo 참고값."""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from app.data.kr_seed_analytics import KR_CONSENSUS_SEED

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2)


def resolve_yahoo_ticker(symbol: str, market: str, exchange: str | None = None) -> str:
    if market == "us":
        return symbol.upper()
    ex = (exchange or "KOSPI").upper()
    suffix = ".KQ" if ex == "KOSDAQ" else ".KS"
    return f"{symbol}{suffix}"


def consensus_for_symbol(symbol: str, market: str) -> dict | None:
    if market != "korea":
        return None
    seed = KR_CONSENSUS_SEED.get(symbol)
    if not seed:
        return None
    return {
        "target_price_avg": seed.get("target_price_avg"),
        "target_price_high": seed.get("target_price_high"),
        "target_price_low": seed.get("target_price_low"),
        "buy_count": seed.get("buy_count"),
        "hold_count": seed.get("hold_count"),
        "sell_count": seed.get("sell_count"),
    }


def analyst_sentiment_label(buy: int | None, hold: int | None, sell: int | None) -> str:
    b, h, s = buy or 0, hold or 0, sell or 0
    total = b + h + s
    if total == 0:
        return "중립"
    ratio = b / total
    if ratio >= 0.65:
        return "적극 매수"
    if ratio >= 0.45:
        return "매수"
    if ratio >= 0.25:
        return "중립"
    if s / total >= 0.35:
        return "매도"
    return "중립"


def company_score(
    *,
    roe: float | None,
    roa: float | None,
    per: float | None,
    upside_pct: float | None,
) -> tuple[int, str]:
    pts = 50.0
    if roe is not None:
        pts += min(25.0, max(-10.0, (roe - 10.0) * 0.8))
    if roa is not None:
        pts += min(10.0, max(-5.0, (roa - 8.0) * 0.5))
    if per is not None and per > 0:
        if per < 12:
            pts += 8.0
        elif per > 35:
            pts -= 8.0
    if upside_pct is not None:
        pts += min(15.0, max(-15.0, upside_pct * 0.5))
    score = int(max(10, min(95, round(pts))))
    if score >= 75:
        return score, "우수"
    if score >= 55:
        return score, "양호"
    if score >= 40:
        return score, "보통"
    return score, "주의"


def pro_tip_text(
    *,
    eps_growth_pct: float | None,
    upside_pct: float | None,
    dividend_streak: int | None,
) -> str:
    if eps_growth_pct is not None and eps_growth_pct > 0:
        return f"참고 EPS 성장률 {eps_growth_pct:.1f}% — 실적 모멘텀을 함께 확인하세요."
    if upside_pct is not None and upside_pct > 8:
        return "애널리스트 목표가 대비 상승 여력이 큰 편입니다."
    if dividend_streak is not None and dividend_streak >= 5:
        return f"최근 {dividend_streak}년 연속 배당 이력이 있습니다."
    return "실적 발표일·거래량과 함께 변동성을 점검하세요."


def _fetch_yahoo_extras_sync(yahoo_ticker: str) -> dict:
    try:
        import yfinance as yf

        ticker = yf.Ticker(yahoo_ticker)
        info = ticker.info or {}
        beta = info.get("beta")
        target = info.get("targetMeanPrice") or info.get("targetMedianPrice")
        eg = info.get("earningsGrowth")
        if eg is None:
            eg = info.get("earningsQuarterlyGrowth")
        eps_growth_pct = None
        if eg is not None:
            eg_f = float(eg)
            eps_growth_pct = eg_f * 100.0 if abs(eg_f) <= 1.5 else eg_f

        streak = _dividend_streak_years(ticker)
        return {
            "beta": float(beta) if beta is not None else None,
            "target_mean": float(target) if target is not None else None,
            "eps_growth_pct": eps_growth_pct,
            "dividend_streak_years": streak,
        }
    except Exception as exc:
        logger.debug("yahoo extras %s: %s", yahoo_ticker, exc)
        return {}


def _dividend_streak_years(ticker) -> int | None:
    try:
        divs = ticker.dividends
        if divs is None or divs.empty:
            return None
        years = sorted(
            {
                int(getattr(ts, "year", datetime.fromisoformat(str(ts)[:10]).year))
                for ts in divs.index
            }
        )
        if not years:
            return None
        streak = 1
        for i in range(len(years) - 1, 0, -1):
            if years[i] - years[i - 1] == 1:
                streak += 1
            else:
                break
        return streak
    except Exception:
        return None


async def fetch_yahoo_extras(symbol: str, market: str, exchange: str | None) -> dict:
    import asyncio

    yahoo_ticker = resolve_yahoo_ticker(symbol, market, exchange)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _fetch_yahoo_extras_sync, yahoo_ticker)

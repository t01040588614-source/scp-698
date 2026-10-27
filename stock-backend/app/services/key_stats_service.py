from __future__ import annotations

import asyncio
import math
from typing import Any

from app.data.key_stats_profiles import KEY_STATS_PROFILES
from app.data.kr_seed_analytics import KR_FUNDAMENTAL_SEED
from app.services.chart_service import chart_service
from app.services.market_data import market_data
from app.services.valuation_insights import (
    analyst_sentiment_label,
    company_score,
    consensus_for_symbol,
    fetch_yahoo_extras,
    pro_tip_text,
)


def _krx_tick_size(price: float) -> int:
    if price < 2000:
        return 1
    if price < 5000:
        return 5
    if price < 20000:
        return 10
    if price < 50000:
        return 50
    if price < 200000:
        return 100
    if price < 500000:
        return 500
    return 1000


def _compute_rsi(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    gains: list[float] = []
    losses: list[float] = []
    for i in range(1, len(closes)):
        delta = closes[i] - closes[i - 1]
        gains.append(max(delta, 0.0))
        losses.append(max(-delta, 0.0))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0 if avg_gain > 0 else 50.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def _fmt_num(value: float | None, decimals: int = 2) -> str | None:
    if value is None or not math.isfinite(value):
        return None
    return f"{value:,.{decimals}f}"


def _fmt_compact(value: float | None) -> str | None:
    if value is None or not math.isfinite(value) or value == 0:
        return None
    abs_v = abs(value)
    if abs_v >= 1e15:
        return f"{value / 1e15:.2f}P"
    if abs_v >= 1e12:
        return f"{value / 1e12:.2f}T"
    if abs_v >= 1e9:
        return f"{value / 1e9:.2f}B"
    if abs_v >= 1e6:
        return f"{value / 1e6:.2f}M"
    if abs_v >= 1e3:
        return f"{value / 1e3:.2f}K"
    return f"{value:.2f}"


def _row(label: str, value: str | None, *, kind: str = "value", premium: bool = False) -> dict:
    return {"label": label, "value": value, "kind": kind, "premium": premium}


class KeyStatsService:
    async def get_key_stats(self, symbol: str, market: str) -> dict[str, Any]:
        market_data.ensure_fresh()
        stock = market_data.get_by_symbol(symbol) or {}
        profile = KEY_STATS_PROFILES.get(symbol, {})
        fund = KR_FUNDAMENTAL_SEED.get(symbol, {}) if market == "korea" else {}

        price = float(stock.get("price") or 0)
        prev = float(stock.get("previous_close") or (price - float(stock.get("change") or 0)))
        open_p = float(stock.get("open") or price)
        high = float(stock.get("high") or price)
        low = float(stock.get("low") or price)
        volume = int(stock.get("volume") or 0)

        tick = _krx_tick_size(price) if price > 0 else 100
        bid = max(price - tick, 0) if price > 0 else None
        ask = price + tick if price > 0 else None

        exchange = (
            (stock.get("market") or stock.get("exchange") or "KOSPI") if market == "korea" else None
        )
        yahoo_extra, hist = await asyncio.gather(
            fetch_yahoo_extras(symbol, market, str(exchange) if exchange else None),
            chart_service.get_history(symbol, market, "1y"),
        )
        points = hist.get("points") or []
        closes = [float(p["close"]) for p in points if p.get("close")]
        highs = [float(p["high"]) for p in points if p.get("high")]
        lows = [float(p["low"]) for p in points if p.get("low")]
        vols = [int(p.get("volume") or 0) for p in points]

        w52_low = min(lows) if lows else None
        w52_high = max(highs) if highs else None
        one_year_change = None
        if len(closes) >= 2 and closes[0] > 0:
            one_year_change = (closes[-1] - closes[0]) / closes[0] * 100

        avg_vol_3m = None
        if vols:
            tail = vols[-63:] if len(vols) >= 63 else vols
            avg_vol_3m = sum(tail) / len(tail) if tail else None

        rsi = _compute_rsi(closes) if closes else None

        shares = profile.get("shares_outstanding")
        market_cap = float(stock.get("market_cap") or 0)
        if market_cap <= 0 and shares and price > 0:
            market_cap = price * float(shares)

        per = fund.get("per") or stock.get("pe_ratio")
        if per == 0:
            per = None
        pbr = profile.get("pbr") or fund.get("pbr")
        roe = profile.get("roe") or fund.get("roe")
        roa = profile.get("roa")
        gross = profile.get("gross_margin")

        div_yield = profile.get("dividend_yield_pct") or fund.get("dividend_yield")
        div_cash = profile.get("dividend_cash")

        bid_ask = (
            f"{_fmt_num(bid, 2)} / {_fmt_num(ask, 2)}"
            if bid is not None and ask is not None
            else None
        )
        day_range = f"{_fmt_num(low, 0)} - {_fmt_num(high, 0)}" if low and high else None
        w52_range = (
            f"{_fmt_num(w52_low, 0)} - {_fmt_num(w52_high, 0)}"
            if w52_low is not None and w52_high is not None
            else None
        )

        dividend_str = None
        if div_cash is not None:
            pct = f" ({div_yield:.2f}%)" if div_yield is not None else ""
            dividend_str = f"{_fmt_num(float(div_cash), 2)}{pct}"

        isin = profile.get("isin")
        if not isin and market == "korea" and len(symbol) == 6:
            isin = f"KR7{symbol}003"

        earnings = profile.get("next_earnings")
        earnings_label = None
        if earnings:
            try:
                y, m, d = str(earnings).split("-")
                earnings_label = f"{y}년 {int(m)}월 {int(d)}일"
            except ValueError:
                earnings_label = str(earnings)

        consensus = consensus_for_symbol(symbol, market)
        fair_value = None
        if consensus and consensus.get("target_price_avg"):
            fair_value = float(consensus["target_price_avg"])
        elif yahoo_extra.get("target_mean"):
            fair_value = float(yahoo_extra["target_mean"])

        upside_pct = None
        if fair_value is not None and price > 0:
            upside_pct = (fair_value - price) / price * 100

        eps_growth = profile.get("eps_growth_pct")
        if eps_growth is None and yahoo_extra.get("eps_growth_pct") is not None:
            eps_growth = yahoo_extra["eps_growth_pct"]

        div_streak = profile.get("dividend_streak_years")
        if div_streak is None and yahoo_extra.get("dividend_streak_years") is not None:
            div_streak = yahoo_extra["dividend_streak_years"]

        beta_val = profile.get("beta")
        if beta_val is None and yahoo_extra.get("beta") is not None:
            beta_val = yahoo_extra["beta"]

        per_f = float(per) if per else None
        score, score_label = company_score(
            roe=float(roe) if roe is not None else None,
            roa=float(roa) if roa is not None else None,
            per=per_f,
            upside_pct=upside_pct,
        )
        sentiment = analyst_sentiment_label(
            consensus.get("buy_count") if consensus else None,
            consensus.get("hold_count") if consensus else None,
            consensus.get("sell_count") if consensus else None,
        )
        tip = pro_tip_text(
            eps_growth_pct=float(eps_growth) if eps_growth is not None else None,
            upside_pct=upside_pct,
            dividend_streak=int(div_streak) if div_streak is not None else None,
        )

        col1 = [
            _row("매수/매도", bid_ask),
            _row("전일 종가", _fmt_num(prev, 0)),
            _row("금일 시가", _fmt_num(open_p, 0)),
            _row("금일 변동", day_range),
            _row("52주 변동폭", w52_range),
            _row("거래량", _fmt_compact(float(volume))),
            _row("평균 거래량 (3개월)", _fmt_compact(avg_vol_3m)),
            _row(
                "1년 변동률",
                f"{one_year_change:.4f}%" if one_year_change is not None else None,
            ),
            _row("적정가치", _fmt_num(fair_value, 0) if fair_value else None),
            _row(
                "적정가치 상승 여력",
                f"{upside_pct:.2f}%" if upside_pct is not None else None,
            ),
        ]

        col2 = [
            _row("시가총액", _fmt_compact(market_cap) if market_cap else None),
            _row("발행주식수", _fmt_compact(shares) if shares else None),
            _row("매출", _fmt_compact(profile.get("revenue"))),
            _row("순이익", _fmt_compact(profile.get("net_income"))),
            _row(
                "주당순이익",
                _fmt_num(profile.get("eps"), 4)
                if profile.get("eps")
                else _fmt_num(stock.get("eps"), 4),
            ),
            _row(
                "주당순이익 성장 예측",
                f"{float(eps_growth):.2f}%" if eps_growth is not None else None,
            ),
            _row("다음 실적 발표일", earnings_label),
            _row("배당금", dividend_str),
            _row(
                "배당금 연속 지급",
                f"{int(div_streak)}년" if div_streak is not None else None,
            ),
            _row("RSI(14)", _fmt_num(rsi, 2) if rsi is not None else None),
        ]

        col3 = [
            _row("주가수익비율", _fmt_num(float(per), 2) if per else None),
            _row("자산순이익률", f"{roa}%" if roa is not None else None),
            _row("자기자본이익률", f"{roe}%" if roe is not None else None),
            _row("매출총이익률", f"{gross}%" if gross is not None else None),
            _row("주식 순자산 비율", _fmt_num(float(pbr), 2) if pbr else None),
            _row("EBITDA", _fmt_compact(profile.get("ebitda"))),
            _row(
                "EV/EBITDA",
                _fmt_num(profile.get("ev_ebitda"), 2) if profile.get("ev_ebitda") else None,
            ),
            _row("베타", _fmt_num(float(beta_val), 2) if beta_val is not None else None),
            _row(
                "장부가치 / 발행 주식 수",
                _fmt_num(profile.get("book_value_per_share"), 2)
                if profile.get("book_value_per_share")
                else None,
            ),
            _row("ISIN", str(isin) if isin else None),
        ]

        for col in (col1, col2, col3):
            for item in col:
                if item["kind"] == "value" and not item.get("value"):
                    item["value"] = "-"

        return {
            "symbol": symbol,
            "market": market,
            "columns": [col1, col2, col3],
            "insights": {
                "companyScore": score,
                "companyScoreLabel": score_label,
                "fairValue": fair_value,
                "fairValueUpsidePct": upside_pct,
                "analystSentiment": sentiment,
                "proTip": tip,
                "epsGrowthPct": float(eps_growth) if eps_growth is not None else None,
                "dividendStreakYears": int(div_streak) if div_streak is not None else None,
                "beta": float(beta_val) if beta_val is not None else None,
            },
        }


key_stats_service = KeyStatsService()

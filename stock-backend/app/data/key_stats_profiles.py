"""Investing 스타일 주요 통계 — 재무·발행 정보 (시세와 별도, 공시·참고값)."""

from __future__ import annotations

from typing import Any

# symbol → 보조 지표 (없으면 API에서 계산 가능한 항목만 표시)
KEY_STATS_PROFILES: dict[str, dict[str, Any]] = {
    "000660": {
        "isin": "KR7000660001",
        "shares_outstanding": 7.28e8,
        "revenue": 66.19e12,
        "net_income": 19.78e12,
        "eps": 27168.0,
        "dividend_cash": 1200.0,
        "dividend_yield_pct": 0.07,
        "next_earnings": "2026-01-22",
        "roa": 18.2,
        "roe": 31.5,
        "gross_margin": 55.8,
        "pbr": 4.85,
        "ebitda": 32.5e12,
        "ev_ebitda": 8.2,
        "book_value_per_share": 376500.0,
        "eps_growth_pct": 12.4,
        "dividend_streak_years": 8,
        "beta": 1.35,
    },
    "011070": {
        "isin": "KR7011070000",
        "shares_outstanding": 2.37e7,
        "revenue": 9.84e12,
        "net_income": 4.12e11,
        "eps": 17382.0,
        "dividend_cash": 2500.0,
        "dividend_yield_pct": 0.68,
        "next_earnings": "2026-04-24",
        "roa": 4.8,
        "roe": 9.2,
        "gross_margin": 18.5,
        "pbr": 0.92,
        "ebitda": 1.05e12,
        "ev_ebitda": 5.4,
        "book_value_per_share": 189000.0,
        "eps_growth_pct": 6.8,
        "dividend_streak_years": 5,
        "beta": 1.08,
    },
    "005930": {
        "isin": "KR7005930003",
        "shares_outstanding": 6.57e9,
        "revenue": 485.27e12,
        "net_income": 149.67e12,
        "eps": 20372.8526,
        "dividend_cash": 1480.0,
        "dividend_yield_pct": 0.54,
        "next_earnings": "2026-10-29",
        "roa": 23.8,
        "roe": 28.4,
        "gross_margin": 57.5,
        "pbr": 3.02,
        "ebitda": 227.12e12,
        "ev_ebitda": 6.61,
        "book_value_per_share": 85681.63,
        "eps_growth_pct": 8.6,
        "dividend_streak_years": 12,
        "beta": 0.92,
    },
}

DEFAULT_ISIN_PREFIX = "KR7"

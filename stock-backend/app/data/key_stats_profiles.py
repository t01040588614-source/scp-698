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
    },
}

DEFAULT_ISIN_PREFIX = "KR7"

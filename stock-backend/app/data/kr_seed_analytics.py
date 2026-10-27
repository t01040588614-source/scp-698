"""DOCX 명세용 더미 재무·뉴스·컨센서스 시드."""

from datetime import UTC, date, datetime

KR_FUNDAMENTAL_SEED: dict[str, dict] = {
    "005930": {
        "fiscal_year": 2024,
        "fiscal_quarter": 2,
        "per": 15.3,
        "pbr": 1.2,
        "roe": 8.5,
        "op_margin": 12.1,
        "net_margin": 9.3,
        "debt_ratio": 40.2,
        "dividend_yield": 2.1,
        "industry": "전기전자",
    },
    "035420": {
        "fiscal_year": 2024,
        "fiscal_quarter": 2,
        "per": 22.0,
        "pbr": 1.8,
        "roe": 11.2,
        "op_margin": 18.0,
        "net_margin": 14.5,
        "debt_ratio": 25.0,
        "dividend_yield": 0.5,
        "industry": "인터넷",
    },
    "011070": {
        "fiscal_year": 2024,
        "fiscal_quarter": 4,
        "per": 10.2,
        "pbr": 0.92,
        "roe": 9.2,
        "op_margin": 6.8,
        "net_margin": 4.2,
        "debt_ratio": 48.5,
        "dividend_yield": 0.68,
        "industry": "전기전자",
    },
}

KR_NEWS_SEED = [
    {
        "code": "005930",
        "title": "반도체 업황 개선 기대… 메모리 수요 회복 신호",
        "summary": "글로벌 AI 서버 수요가 DRAM·HBM 실적 개선에 긍정적 영향을 줄 수 있다는 분석.",
        "url": "https://kr.investing.com/equities/samsung-electronics-co-ltd",
        "source": "Market Desk",
        "published_at": datetime(2026, 9, 29, 6, 30, tzinfo=UTC),
        "sentiment": "neutral",
    },
    {
        "code": "011070",
        "title": "LG이노텍, IT·모바일 부품 수요 회복에 실적 개선 기대",
        "summary": "카메라 모듈·전장 부품 물량 확대가 마진 방어에 긍정적이라는 증권사 코멘트.",
        "url": "https://kr.investing.com/equities/lg-innotek-co-ltd",
        "source": "KR Tech Desk",
        "published_at": datetime(2026, 10, 20, 3, 0, tzinfo=UTC),
        "sentiment": "positive",
    },
    {
        "code": None,
        "title": "코스피, 외국인 순매수에 장중 강세",
        "summary": "대형주 중심으로 지수가 상승하며 투자 심리가 개선됐습니다.",
        "url": None,
        "source": "KR Market",
        "published_at": datetime(2026, 9, 28, 2, 0, tzinfo=UTC),
        "sentiment": "positive",
    },
]

KR_CONSENSUS_SEED: dict[str, dict] = {
    "005930": {
        "as_of": date(2026, 9, 25),
        "target_price_avg": 82000,
        "target_price_high": 95000,
        "target_price_low": 70000,
        "buy_count": 28,
        "hold_count": 6,
        "sell_count": 1,
    },
    "035420": {
        "as_of": date(2026, 9, 20),
        "target_price_avg": 240000,
        "target_price_high": 280000,
        "target_price_low": 200000,
        "buy_count": 18,
        "hold_count": 10,
        "sell_count": 2,
    },
    "011070": {
        "as_of": date(2026, 10, 15),
        "target_price_avg": 198000,
        "target_price_high": 230000,
        "target_price_low": 165000,
        "buy_count": 14,
        "hold_count": 8,
        "sell_count": 2,
    },
}

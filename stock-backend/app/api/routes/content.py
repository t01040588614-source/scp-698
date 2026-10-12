from fastapi import APIRouter, Query

from app.services.economic_calendar_service import get_economic_calendar
from app.services.news_feed_service import get_finance_news

router = APIRouter()

NEWS_FALLBACK = [
    {
        "id": "n1",
        "category": "시장",
        "title": "글로벌 금융시장 주요 지표와 투자자 관심 종목 동향",
        "source": "Market Desk",
        "published_at": "2026-09-29T06:30:00Z",
        "thumbnail": "/images/news-placeholder.svg",
    },
    {
        "id": "n2",
        "category": "경제",
        "title": "주요 경제 이벤트를 앞두고 시장 변동성 확대",
        "source": "Economy Brief",
        "published_at": "2026-09-29T05:10:00Z",
        "thumbnail": "/images/news-placeholder.svg",
    },
    {
        "id": "n3",
        "category": "기업",
        "title": "반도체 업종 실적 전망과 글로벌 수요 회복 신호",
        "source": "Sector Watch",
        "published_at": "2026-09-28T14:00:00Z",
        "thumbnail": "/images/news-placeholder.svg",
    },
]


@router.get("/news")
async def list_news(refresh: bool = Query(False, description="캐시 무시하고 RSS 즉시 재조회")):
    payload = await get_finance_news(force_refresh=refresh)
    if payload.get("data"):
        return payload
    return {
        "data": NEWS_FALLBACK,
        "status": "fallback",
        "fetched_at": None,
        "sources": [],
        "counts": {"시장": 1, "경제": 1, "기업": 1, "미국": 0},
        "refresh_sec": 90,
    }


@router.get("/calendar")
async def list_calendar(
    from_date: str | None = Query(None, alias="from", description="YYYY-MM-DD"),
    to_date: str | None = Query(None, alias="to", description="YYYY-MM-DD"),
    refresh: bool = Query(False, description="캐시 무시하고 즉시 재조회"),
):
    return await get_economic_calendar(from_date, to_date, force_refresh=refresh)

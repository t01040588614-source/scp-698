"""NewsAPI.org headlines."""

from __future__ import annotations

import httpx

from app.integrations.key_store import get_key


def is_configured() -> bool:
    return bool(get_key("NEWS_API_KEY"))


async def top_headlines(
    category: str = "business",
    page_size: int = 10,
    *,
    country: str | None = None,
) -> list[dict]:
    api_key = get_key("NEWS_API_KEY")
    if not api_key:
        return []
    url = "https://newsapi.org/v2/top-headlines"
    params: dict[str, str | int] = {"category": category, "pageSize": page_size, "apiKey": api_key}
    if country:
        params["country"] = country.lower()
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=20.0)
        if resp.status_code != 200:
            return []
        data = resp.json()
    articles = data.get("articles") or []
    out: list[dict] = []
    for i, a in enumerate(articles):
        out.append(
            {
                "id": f"newsapi-{i}",
                "category": category,
                "title": a.get("title") or "",
                "source": (a.get("source") or {}).get("name") or "NewsAPI",
                "published_at": a.get("publishedAt"),
                "thumbnail": a.get("urlToImage") or "/images/news-placeholder.svg",
                "url": a.get("url"),
            }
        )
    return out

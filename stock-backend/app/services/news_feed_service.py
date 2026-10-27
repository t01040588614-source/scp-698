"""금융 뉴스 — Google News · 한국경제 · Investing.com · Yahoo Finance RSS 통합."""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo

import httpx

from app.integrations.news_client import is_configured as newsapi_configured
from app.integrations.news_client import top_headlines as newsapi_headlines
from app.services.news_thumbnail_service import (
    PLACEHOLDER,
    drop_duplicate_thumbnails,
    enrich_news_thumbnails,
    extract_thumbnail_from_item,
    is_google_news_url,
    is_placeholder,
    normalize_thumbnail_url,
)

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")

HTTP_HEADERS = {
    "User-Agent": "MarketLens/1.0 (+local stock dashboard; finance news RSS)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}

NEWS_CATEGORIES: tuple[str, ...] = ("시장", "경제", "기업", "미국")

# category: 시장 | 경제 | 기업 | 미국
RSS_FEEDS: list[dict[str, str]] = [
    {"id": "hankyung-finance", "category": "시장", "url": "https://www.hankyung.com/feed/finance"},
    {"id": "hankyung-economy", "category": "경제", "url": "https://www.hankyung.com/feed/economy"},
    {
        "id": "investing-kr-stock",
        "category": "시장",
        "url": "https://kr.investing.com/rss/news_25.rss",
    },
    {
        "id": "investing-kr-econ",
        "category": "경제",
        "url": "https://kr.investing.com/rss/news_11.rss",
    },
    {
        "id": "investing-kr-world",
        "category": "시장",
        "url": "https://kr.investing.com/rss/news_14.rss",
    },
    {
        "id": "investing-kr-company",
        "category": "기업",
        "url": "https://kr.investing.com/rss/news_285.rss",
    },
    {
        "id": "investing-kr-analysis",
        "category": "기업",
        "url": "https://kr.investing.com/rss/news_12.rss",
    },
    {"id": "investing-kr-all", "category": "시장", "url": "https://kr.investing.com/rss/news.rss"},
    {
        "id": "yahoo-sp500",
        "category": "미국",
        "url": "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US",
    },
    {
        "id": "yahoo-dow",
        "category": "미국",
        "url": "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EDJI&region=US&lang=en-US",
    },
    {
        "id": "cnbc-top",
        "category": "미국",
        "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
    },
    {
        "id": "marketwatch-top",
        "category": "미국",
        "url": "https://feeds.marketwatch.com/marketwatch/topstories/",
    },
    {"id": "investing-us", "category": "미국", "url": "https://www.investing.com/rss/news.rss"},
    {
        "id": "investing-us-stock",
        "category": "미국",
        "url": "https://www.investing.com/rss/news_25.rss",
    },
]

NEWSAPI_CATEGORY_MAP = {
    ("business", None): "시장",
    ("technology", None): "기업",
    ("general", None): "경제",
    ("business", "us"): "미국",
    ("technology", "us"): "미국",
}

_cache: dict[str, object] = {"items": [], "fetched_at": None, "sources": []}
_cache_lock = asyncio.Lock()
_CACHE_TTL_SEC = 90
_PER_CATEGORY_LIMIT = 24


def _local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _parse_pub_date(raw: str | None) -> datetime:
    if not raw or not str(raw).strip():
        return datetime.now(UTC)
    text = str(raw).strip()
    try:
        dt = parsedate_to_datetime(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt
    except (TypeError, ValueError):
        pass
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt
    except ValueError:
        return datetime.now(UTC)


def _normalize_title(title: str) -> str:
    t = re.sub(r"\s+", " ", title.strip().lower())
    t = re.sub(r"\s*-\s*[^-]+$", "", t)
    return t


def _item_id(link: str, title: str) -> str:
    key = f"{link}|{title}".encode("utf-8", errors="ignore")
    return hashlib.sha256(key).hexdigest()[:20]


def _child_text(item: ET.Element, local_name: str) -> str:
    for child in item:
        if _local_tag(child.tag) == local_name:
            return (child.text or "").strip()
    return ""


def _parse_rss_xml(body: bytes, *, default_category: str, feed_id: str) -> list[dict]:
    try:
        root = ET.fromstring(body)
    except ET.ParseError as exc:
        logger.warning("RSS parse error (%s): %s", feed_id, exc)
        return []

    items: list[dict] = []
    for item in root.iter():
        if _local_tag(item.tag) != "item":
            continue
        title = _child_text(item, "title")
        if not title or title == "[Removed]":
            continue
        link = _child_text(item, "link")
        pub = _parse_pub_date(_child_text(item, "pubDate") or _child_text(item, "published"))
        source = _child_text(item, "source") or feed_id.split("-")[0]

        thumb = extract_thumbnail_from_item(item)

        items.append(
            {
                "id": _item_id(link or title, title),
                "category": default_category,
                "title": title,
                "source": source.replace("news.google.com", "Google News"),
                "published_at": pub.astimezone(UTC).isoformat(),
                "thumbnail": normalize_thumbnail_url(thumb) if thumb else PLACEHOLDER,
                "url": link or None,
                "feed_id": feed_id,
            }
        )
    return items


async def _fetch_one_feed(client: httpx.AsyncClient, feed: dict[str, str]) -> list[dict]:
    try:
        resp = await client.get(feed["url"], headers=HTTP_HEADERS, timeout=20.0)
        if resp.status_code != 200 or not resp.content:
            logger.debug("RSS skip %s HTTP %s", feed["id"], resp.status_code)
            return []
        return _parse_rss_xml(
            resp.content,
            default_category=feed["category"],
            feed_id=feed["id"],
        )
    except (httpx.HTTPError, OSError) as exc:
        logger.warning("RSS fetch failed (%s): %s", feed["id"], exc)
        return []


async def _fetch_newsapi_items() -> list[dict]:
    if not newsapi_configured():
        return []
    requests = [
        ("business", 10, None),
        ("technology", 8, None),
        ("general", 8, None),
        ("business", 12, "us"),
        ("technology", 8, "us"),
    ]
    chunks = await asyncio.gather(
        *[
            newsapi_headlines(category=cat, page_size=size, country=country)
            for cat, size, country in requests
        ]
    )
    out: list[dict] = []
    for (cat, _size, country), rows in zip(requests, chunks, strict=True):
        label = NEWSAPI_CATEGORY_MAP.get(
            (cat, country), NEWSAPI_CATEGORY_MAP.get((cat, None), "시장")
        )
        suffix = f"{cat}-{country}" if country else cat
        for row in rows:
            out.append(
                {
                    **row,
                    "category": label,
                    "feed_id": f"newsapi-{suffix}",
                }
            )
    return out


def _dedupe_and_cap(raw: list[dict]) -> list[dict]:
    seen: set[str] = set()
    by_cat: dict[str, list[dict]] = {cat: [] for cat in NEWS_CATEGORIES}

    def _sort_key(row: dict) -> tuple:
        thumb = str(row.get("thumbnail") or "")
        url = str(row.get("url") or "")
        has_img = 0 if is_placeholder(thumb) else 1
        google = 1 if is_google_news_url(url) else 0
        pub = str(row.get("published_at") or "")
        return (has_img, -google, pub)

    sorted_rows = sorted(raw, key=_sort_key, reverse=True)
    for row in sorted_rows:
        norm = _normalize_title(str(row.get("title") or ""))
        if not norm or norm in seen:
            continue
        if is_google_news_url(str(row.get("url") or "")) and is_placeholder(
            str(row.get("thumbnail") or "")
        ):
            continue
        seen.add(norm)
        cat = str(row.get("category") or "시장")
        if cat not in by_cat:
            cat = "시장"
        if len(by_cat[cat]) >= _PER_CATEGORY_LIMIT:
            continue
        by_cat[cat].append(row)

    merged: list[dict] = []
    for cat in NEWS_CATEGORIES:
        merged.extend(by_cat[cat])
    return merged


async def _collect_live_news() -> tuple[list[dict], list[str]]:
    async with httpx.AsyncClient(follow_redirects=True) as client:
        rss_batches = await asyncio.gather(*[_fetch_one_feed(client, f) for f in RSS_FEEDS])
    rss_items = [row for batch in rss_batches for row in batch]
    api_items = await _fetch_newsapi_items()
    combined = rss_items + api_items
    for row in combined:
        row["thumbnail"] = normalize_thumbnail_url(str(row.get("thumbnail") or ""))
    capped = _dedupe_and_cap(combined)
    await enrich_news_thumbnails(capped)
    capped = [r for r in capped if not is_placeholder(str(r.get("thumbnail") or ""))]
    capped = drop_duplicate_thumbnails(capped)
    sources = sorted({str(r.get("feed_id") or "rss") for r in capped})
    return capped, sources


async def get_finance_news(*, force_refresh: bool = False) -> dict:
    now = datetime.now(KST)
    async with _cache_lock:
        fetched_at = _cache.get("fetched_at")
        if (
            not force_refresh
            and isinstance(fetched_at, datetime)
            and (now - fetched_at).total_seconds() < _CACHE_TTL_SEC
            and _cache.get("items")
        ):
            items = _cache["items"]
            assert isinstance(items, list)
            src = _cache.get("sources")
            sources = list(src) if isinstance(src, list) else []
            return _response_payload(items, fetched_at, sources)

    items, sources = await _collect_live_news()
    fetched_at = datetime.now(KST)

    async with _cache_lock:
        if items:
            _cache["items"] = items
            _cache["fetched_at"] = fetched_at
            _cache["sources"] = sources
        elif _cache.get("items"):
            items = _cache["items"]
            assert isinstance(items, list)
            prev = _cache.get("fetched_at")
            fetched_at = prev if isinstance(prev, datetime) else fetched_at
            sources = _cache.get("sources") or sources

    src_list = list(sources) if isinstance(sources, list) else []
    return _response_payload(items if isinstance(items, list) else [], fetched_at, src_list)


def _response_payload(items: list[dict], fetched_at: datetime, sources: list) -> dict:
    counts = {cat: 0 for cat in NEWS_CATEGORIES}
    for row in items:
        c = str(row.get("category") or "")
        if c in counts:
            counts[c] += 1
    return {
        "data": items,
        "status": "live" if items else "empty",
        "fetched_at": fetched_at.astimezone(KST).isoformat(),
        "sources": list(sources) if isinstance(sources, list) else [],
        "counts": counts,
        "refresh_sec": _CACHE_TTL_SEC,
    }

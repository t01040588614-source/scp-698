"""뉴스 썸네일 — RSS 미디어 · og:image (목록용)."""

from __future__ import annotations

import asyncio
import logging
import re
from urllib.parse import urlparse, urlunparse

from xml.etree import ElementTree as ET

import httpx

logger = logging.getLogger(__name__)

PLACEHOLDER = "/images/news-placeholder.svg"
PLACEHOLDER_MARKERS = ("/images/news-placeholder", "news-placeholder.svg")

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}

_OG_PATTERNS = (
    re.compile(r'<meta[^>]+property=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image(?::secure_url)?["\']', re.I),
    re.compile(r'<meta[^>]+name=["\']twitter:image(?::src)?["\'][^>]+content=["\']([^"\']+)', re.I),
    re.compile(r'<link[^>]+rel=["\']image_src["\'][^>]+href=["\']([^"\']+)', re.I),
)

_IMG_SRC_RE = re.compile(r"""<img[^>]+src=["']([^"']+)["']""", re.I)

_og_cache: dict[str, str] = {}
_og_lock = asyncio.Lock()


def _local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def is_placeholder(url: str | None) -> bool:
    if not url:
        return True
    u = url.strip().lower()
    return u.startswith("/") or any(m in u for m in PLACEHOLDER_MARKERS)


def is_google_news_url(url: str | None) -> bool:
    if not url:
        return False
    return "news.google.com" in url.lower()


def normalize_thumbnail_url(url: str) -> str:
    if not url or is_placeholder(url):
        return PLACEHOLDER
    u = url.strip().replace("&amp;", "&")
    if not u.startswith("http"):
        return PLACEHOLDER
    parsed = urlparse(u)
    if "images.unsplash.com" in parsed.netloc:
        base = u.split("?")[0]
        return f"{base}?w=480&q=80&auto=format&fit=crop"
    return urlunparse(parsed)


def thumbnail_dedupe_key(url: str | None) -> str:
    if is_placeholder(url):
        return ""
    u = normalize_thumbnail_url(str(url))
    parsed = urlparse(u)
    path = (parsed.path or "").lower().rstrip("/")
    return f"{parsed.netloc.lower()}{path}"


def extract_thumbnail_from_item(item: ET.Element) -> str:
    thumb = ""
    description = ""
    for child in item:
        ln = _local_tag(child.tag)
        if ln == "description":
            description = "".join(child.itertext())
        if ln == "enclosure" and (child.get("type") or "").startswith("image"):
            thumb = child.get("url") or thumb
        if ln in ("thumbnail", "content"):
            medium = (child.get("medium") or "").lower()
            mime = (child.get("type") or "").lower()
            c_url = child.get("url") or ""
            if c_url and (medium == "image" or mime.startswith("image") or ln == "thumbnail"):
                thumb = c_url
    if not thumb and description:
        for m in _IMG_SRC_RE.finditer(description):
            candidate = m.group(1).strip()
            if candidate.startswith("http"):
                thumb = candidate
                break
    return normalize_thumbnail_url(thumb) if thumb else PLACEHOLDER


def _extract_og_from_html(html: str) -> str | None:
    for pat in _OG_PATTERNS:
        m = pat.search(html)
        if m:
            url = m.group(1).strip()
            if url.startswith("http"):
                return url
    return None


async def _fetch_og_image(client: httpx.AsyncClient, article_url: str) -> str | None:
    if is_google_news_url(article_url):
        return None

    async with _og_lock:
        cached = _og_cache.get(article_url)
    if cached is not None:
        return cached or None

    image: str | None = None
    try:
        resp = await client.get(article_url, headers=HTTP_HEADERS, timeout=10.0)
        if resp.status_code == 200:
            image = _extract_og_from_html(resp.text[:500_000])
    except (httpx.HTTPError, OSError, UnicodeDecodeError) as exc:
        logger.debug("og:image skip %s: %s", article_url[:72], exc)

    async with _og_lock:
        _og_cache[article_url] = image or ""
    return image


def _enrich_priority(row: dict) -> tuple[int, int]:
    """(썸네일 없음=1, Google URL=1) — 낮을수록 먼저 처리."""
    missing = 1 if is_placeholder(str(row.get("thumbnail") or "")) else 0
    google = 1 if is_google_news_url(str(row.get("url") or "")) else 0
    return (missing, google)


async def enrich_news_thumbnails(items: list[dict]) -> list[dict]:
    """placeholder 항목 og:image 조회 (전체 대상, 직접 URL 우선)."""
    targets = [r for r in items if is_placeholder(str(r.get("thumbnail") or ""))]
    targets.sort(key=_enrich_priority)

    sem = asyncio.Semaphore(14)

    async with httpx.AsyncClient(follow_redirects=True) as client:

        async def process(row: dict) -> None:
            article = row.get("url")
            if not isinstance(article, str) or not article.startswith("http"):
                row["thumbnail"] = PLACEHOLDER
                return
            if is_google_news_url(article):
                row["thumbnail"] = PLACEHOLDER
                return
            async with sem:
                og = await _fetch_og_image(client, article)
            row["thumbnail"] = normalize_thumbnail_url(og) if og else PLACEHOLDER

        await asyncio.gather(*[process(r) for r in targets])

    for row in items:
        if not is_placeholder(str(row.get("thumbnail") or "")):
            row["thumbnail"] = normalize_thumbnail_url(str(row.get("thumbnail")))

    return items


def drop_duplicate_thumbnails(items: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for row in items:
        key = thumbnail_dedupe_key(str(row.get("thumbnail") or ""))
        if key:
            if key in seen:
                continue
            seen.add(key)
        out.append(row)
    return out

from app.services.news_thumbnail_service import (
    drop_duplicate_thumbnails,
    is_placeholder,
    normalize_thumbnail_url,
    thumbnail_dedupe_key,
)


def test_normalize_keeps_url_without_4k_hack():
    url = "https://content-media.investing.com/news/abc.jpg"
    out = normalize_thumbnail_url(url)
    assert out == url
    assert "w=3840" not in out


def test_placeholder_detection():
    assert is_placeholder("/images/news-placeholder.svg")
    assert not is_placeholder("https://img.hankyung.com/photo/x.jpg")


def test_drop_duplicate_thumbnails():
    rows = [
        {"id": "1", "thumbnail": "https://cdn.example.com/a.jpg"},
        {"id": "2", "thumbnail": "https://cdn.example.com/a.jpg?v=1"},
        {"id": "3", "thumbnail": "/images/news-placeholder.svg"},
        {"id": "4", "thumbnail": "/images/news-placeholder.svg"},
    ]
    out = drop_duplicate_thumbnails(rows)
    assert len(out) == 3
    assert thumbnail_dedupe_key(rows[0]["thumbnail"]) == thumbnail_dedupe_key(rows[1]["thumbnail"])

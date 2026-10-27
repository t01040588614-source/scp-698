"""Optional Redis — 로그인 rate limit 등 (미연결 시 메모리 폴백)."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Any | None = None
_redis_checked = False
_redis_available = False


def _get_client():
    global _client, _redis_checked, _redis_available
    if _redis_checked:
        return _client if _redis_available else None
    _redis_checked = True
    if not (settings.REDIS_URL or "").strip():
        _redis_available = False
        _client = None
        return None
    try:
        import redis
        from redis.exceptions import RedisError

        c = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.5)
        c.ping()
        _client = c
        _redis_available = True
        logger.info("Redis connected at %s", settings.REDIS_URL.split("@")[-1])
    except ImportError as exc:
        _redis_available = False
        _client = None
        logger.debug("Redis unavailable (%s) — in-memory fallback", exc)
    except (OSError, RedisError) as exc:
        _redis_available = False
        _client = None
        logger.debug("Redis unavailable (%s) — in-memory fallback", exc)
    return _client if _redis_available else None


def redis_status() -> dict:
    client = _get_client()
    return {"enabled": client is not None, "url": settings.REDIS_URL if client else None}


def incr_with_ttl(key: str, ttl_sec: int) -> int:
    client = _get_client()
    if not client:
        return -1
    pipe = client.pipeline()
    pipe.incr(key)
    pipe.expire(key, ttl_sec)
    result = pipe.execute()
    return int(result[0])


def get_int(key: str) -> int | None:
    client = _get_client()
    if not client:
        return None
    raw = client.get(key)
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def set_json(key: str, value: Any, ttl_sec: int) -> None:
    client = _get_client()
    if not client:
        return
    client.setex(key, ttl_sec, json.dumps(value))


def get_json(key: str) -> Any | None:
    client = _get_client()
    if not client:
        return None
    raw = client.get(key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def set_lock_until(key: str, until_epoch: float) -> None:
    client = _get_client()
    if not client:
        return
    ttl = max(1, int(until_epoch - time.time()))
    client.setex(key, ttl, str(int(until_epoch)))

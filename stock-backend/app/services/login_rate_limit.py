"""로그인 brute-force 완화 — Redis 우선, 없으면 프로세스 메모리."""

from __future__ import annotations

import time

from fastapi import HTTPException, Request, status

from app.core.redis_store import get_int, incr_with_ttl, set_lock_until

_WINDOW_SEC = 15 * 60
_MAX_FAILURES = 10
_LOCKOUT_SEC = 15 * 60

_failures: dict[str, list[float]] = {}
_lock_until: dict[str, float] = {}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _key(request: Request, email: str) -> str:
    return f"login:{_client_ip(request)}:{email.strip().lower()}"


def _mem_purge_old(key: str, now: float) -> None:
    times = _failures.get(key, [])
    cutoff = now - _WINDOW_SEC
    _failures[key] = [t for t in times if t >= cutoff]
    if not _failures[key]:
        _failures.pop(key, None)


def assert_login_allowed(request: Request, email: str) -> None:
    now = time.time()
    key = _key(request, email)
    lock_key = f"{key}:lock"
    locked_until = get_int(lock_key)
    if locked_until is not None and locked_until > int(now):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="로그인 시도 횟수가 많습니다. 잠시 후 다시 시도해 주세요.",
        )
    mem_locked = _lock_until.get(key)
    if mem_locked and mem_locked > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="로그인 시도 횟수가 많습니다. 잠시 후 다시 시도해 주세요.",
        )
    if mem_locked and mem_locked <= now:
        _lock_until.pop(key, None)


def record_login_failure(request: Request, email: str) -> None:
    now = time.time()
    key = _key(request, email)
    fail_key = f"{key}:fail"
    count = incr_with_ttl(fail_key, _WINDOW_SEC)
    if count >= 0:
        if count >= _MAX_FAILURES:
            set_lock_until(f"{key}:lock", now + _LOCKOUT_SEC)
        return

    _mem_purge_old(key, now)
    _failures.setdefault(key, []).append(now)
    if len(_failures[key]) >= _MAX_FAILURES:
        _lock_until[key] = now + _LOCKOUT_SEC
        _failures.pop(key, None)


def record_login_success(request: Request, email: str) -> None:
    key = _key(request, email)
    _failures.pop(key, None)
    _lock_until.pop(key, None)

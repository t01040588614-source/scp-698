"""Refresh token 발급·검증 (DB)."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.auth_tokens import RefreshToken
from app.models.user import User

_DEFAULT_DAYS = 14


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def issue_refresh_token(db: AsyncSession, user: User) -> str:
    plain = secrets.token_urlsafe(48)
    days = settings.REFRESH_TOKEN_EXPIRE_DAYS or _DEFAULT_DAYS
    expires = datetime.now(UTC) + timedelta(days=days)
    row = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(plain),
        expires_at=expires,
    )
    db.add(row)
    await db.flush()
    return plain


async def rotate_refresh_token(db: AsyncSession, plain: str) -> tuple[User, str] | None:
    needle = _hash_token(plain.strip())
    now = datetime.now(UTC)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == needle)
    )
    row = result.scalar_one_or_none()
    exp = row.expires_at if row else now
    if row and exp.tzinfo is None:
        exp = exp.replace(tzinfo=UTC)
    if not row or row.revoked_at or exp <= now:
        return None
    user_res = await db.execute(select(User).where(User.id == row.user_id))
    user = user_res.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    row.revoked_at = now
    new_plain = await issue_refresh_token(db, user)
    return user, new_plain


async def revoke_refresh_token(db: AsyncSession, plain: str) -> None:
    needle = _hash_token(plain.strip())
    now = datetime.now(UTC)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == needle, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )

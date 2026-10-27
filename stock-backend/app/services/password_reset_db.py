"""DB 영속 비밀번호 재설정 토큰."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.integrations import email_client
from app.models.auth_tokens import PasswordResetToken
from app.models.user import User

_TOKEN_TTL_SEC = 3600


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def issue_reset_token(db: AsyncSession, user: User) -> str:
    plain = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(seconds=_TOKEN_TTL_SEC)
    await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    row = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(plain),
        expires_at=expires,
    )
    db.add(row)
    await db.flush()
    return plain


async def consume_reset_token(db: AsyncSession, token: str) -> str | None:
    needle = _hash_token(token.strip())
    now = datetime.now(UTC)
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == needle)
    )
    row = result.scalar_one_or_none()
    if not row:
        return None
    exp = row.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=UTC)
    if exp <= now:
        await db.delete(row)
        return None

    user_res = await db.execute(select(User).where(User.id == row.user_id))
    user = user_res.scalar_one_or_none()
    await db.delete(row)
    if not user:
        return None
    return user.email


async def send_reset_link(user: User, plain_token: str) -> None:
    base = settings.OAUTH_FRONTEND_BASE.rstrip("/")
    url = f"{base}/login/reset-password?token={plain_token}"
    if email_client.is_configured():
        email_client.send_password_reset_email(to_email=user.email, reset_url=url)
    elif settings.DEBUG:
        return
    else:
        raise RuntimeError("SMTP 미설정 — 운영 환경에서는 SMTP_* 환경 변수를 설정하세요")

"""액세스·리프레시 토큰 쌍 발급."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.services.refresh_token_service import issue_refresh_token


async def issue_auth_token_pair(db: AsyncSession, user: User) -> dict[str, str]:
    access = create_access_token(
        subject={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh = await issue_refresh_token(db, user)
    return {
        "access_token": access,
        "token_type": "bearer",
        "refresh_token": refresh,
    }

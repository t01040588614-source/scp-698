"""소셜 OAuth — 키 설정 시에만 활성."""

from __future__ import annotations

import secrets
from datetime import timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.db.session import get_db
from app.integrations.key_store import get_key
from app.integrations.registry import google_oauth_enabled, kakao_oauth_enabled
from app.models.user import User
from app.services.user_service import UserService

router = APIRouter(tags=["OAuth (API Key)"])

_oauth_states: dict[str, str] = {}


@router.get("/providers")
async def oauth_providers():
    providers = []
    if google_oauth_enabled():
        providers.append(
            {
                "id": "google",
                "name": "Google",
                "loginUrl": f"{settings.API_V1_PREFIX}/auth/oauth/google",
            }
        )
    if kakao_oauth_enabled():
        providers.append(
            {
                "id": "kakao",
                "name": "Kakao",
                "loginUrl": f"{settings.API_V1_PREFIX}/auth/oauth/kakao",
            }
        )
    return {"providers": providers}


def _redirect_uri(provider: str) -> str:
    base = settings.OAUTH_BACKEND_BASE.rstrip("/")
    return f"{base}{settings.API_V1_PREFIX}/auth/oauth/{provider}/callback"


def _frontend_token_redirect(token: str) -> RedirectResponse:
    front = settings.OAUTH_FRONTEND_BASE.rstrip("/")
    return RedirectResponse(url=f"{front}/login/oauth-complete?token={token}")


async def _upsert_oauth_user(db: AsyncSession, email: str, username: str, full_name: str | None) -> User:
    service = UserService(db)
    user = await service.get_by_email(email)
    if user:
        return user
    base_username = username[:40]
    candidate = base_username
    n = 0
    while await service.get_by_username(candidate):
        n += 1
        candidate = f"{base_username}_{n}"[:48]
    user = User(
        email=email,
        username=candidate,
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
        full_name=full_name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/google")
async def google_login():
    if not google_oauth_enabled():
        raise HTTPException(status_code=503, detail="Google OAuth 키를 설정하세요")
    state = secrets.token_urlsafe(16)
    _oauth_states[state] = "google"
    params = {
        "client_id": get_key("GOOGLE_CLIENT_ID"),
        "redirect_uri": _redirect_uri("google"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if not code or not state or _oauth_states.pop(state, None) != "google":
        raise HTTPException(status_code=400, detail="OAuth state 오류")
    token_url = "https://oauth2.googleapis.com/token"
    async with httpx.AsyncClient() as client:
        tok = await client.post(
            token_url,
            data={
                "code": code,
                "client_id": get_key("GOOGLE_CLIENT_ID"),
                "client_secret": get_key("GOOGLE_CLIENT_SECRET"),
                "redirect_uri": _redirect_uri("google"),
                "grant_type": "authorization_code",
            },
            timeout=20.0,
        )
        tok.raise_for_status()
        access = tok.json().get("access_token")
        if not access:
            raise HTTPException(status_code=400, detail="Google token 실패")
        prof = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access}"},
            timeout=15.0,
        )
        prof.raise_for_status()
        info = prof.json()
    email = info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="이메일을 가져올 수 없습니다")
    user = await _upsert_oauth_user(
        db,
        email=email,
        username=email.split("@")[0],
        full_name=info.get("name"),
    )
    jwt = create_access_token(
        subject={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return _frontend_token_redirect(jwt)


@router.get("/kakao")
async def kakao_login():
    if not kakao_oauth_enabled():
        raise HTTPException(status_code=503, detail="Kakao REST API 키를 설정하세요")
    state = secrets.token_urlsafe(16)
    _oauth_states[state] = "kakao"
    params = {
        "client_id": get_key("KAKAO_REST_API_KEY"),
        "redirect_uri": _redirect_uri("kakao"),
        "response_type": "code",
        "state": state,
    }
    url = "https://kauth.kakao.com/oauth/authorize?" + urlencode(params)
    return RedirectResponse(url)


@router.get("/kakao/callback")
async def kakao_callback(
    code: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if not code or not state or _oauth_states.pop(state, None) != "kakao":
        raise HTTPException(status_code=400, detail="OAuth state 오류")
    async with httpx.AsyncClient() as client:
        tok = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": get_key("KAKAO_REST_API_KEY"),
                "redirect_uri": _redirect_uri("kakao"),
                "code": code,
                **(
                    {"client_secret": get_key("KAKAO_CLIENT_SECRET")}
                    if get_key("KAKAO_CLIENT_SECRET")
                    else {}
                ),
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=20.0,
        )
        tok.raise_for_status()
        access = tok.json().get("access_token")
        prof = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access}"},
            timeout=15.0,
        )
        prof.raise_for_status()
        info = prof.json()
    kakao_account = info.get("kakao_account") or {}
    email = kakao_account.get("email") or f"kakao_{info.get('id')}@oauth.local"
    nickname = (kakao_account.get("profile") or {}).get("nickname") or f"kakao_{info.get('id')}"
    user = await _upsert_oauth_user(db, email=email, username=nickname, full_name=nickname)
    jwt = create_access_token(
        subject={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return _frontend_token_redirect(jwt)

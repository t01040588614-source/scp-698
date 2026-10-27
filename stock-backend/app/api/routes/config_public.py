"""공개 설정 — Firebase Web Push(SW) 등."""

from fastapi import APIRouter, HTTPException

from app.core.config import settings

router = APIRouter(prefix="/config", tags=["설정"])


def firebase_public_payload() -> dict:
    required = (
        settings.FIREBASE_API_KEY,
        settings.FIREBASE_PROJECT_ID,
        settings.FIREBASE_MESSAGING_SENDER_ID,
        settings.FIREBASE_APP_ID,
        settings.FIREBASE_VAPID_KEY,
    )
    if not all(required):
        raise HTTPException(status_code=404, detail="Firebase Web Push가 설정되지 않았습니다")
    return {
        "apiKey": settings.FIREBASE_API_KEY,
        "authDomain": (
            settings.FIREBASE_AUTH_DOMAIN
            or f"{settings.FIREBASE_PROJECT_ID}.firebaseapp.com"
        ),
        "projectId": settings.FIREBASE_PROJECT_ID,
        "messagingSenderId": settings.FIREBASE_MESSAGING_SENDER_ID,
        "appId": settings.FIREBASE_APP_ID,
        "vapidKey": settings.FIREBASE_VAPID_KEY,
    }


@router.get("/firebase-public")
async def firebase_public():
    """Service Worker·클라이언트 FCM 초기화용(비밀키 제외)."""
    return firebase_public_payload()

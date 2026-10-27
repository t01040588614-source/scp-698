"""FCM — HTTP v1(서비스 계정) 우선, Legacy Server Key 폴백."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import httpx

from app.core.config import settings
from app.integrations.key_store import get_key

logger = logging.getLogger(__name__)

_V1_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"


def _legacy_configured() -> bool:
    return bool(get_key("FCM_SERVER_KEY"))


def _service_account_info() -> dict | None:
    raw = get_key("FCM_SERVICE_ACCOUNT_JSON") or settings.FCM_SERVICE_ACCOUNT_JSON
    if not raw:
        path = get_key("FCM_SERVICE_ACCOUNT_FILE") or settings.FCM_SERVICE_ACCOUNT_FILE
        if path:
            try:
                raw = Path(path).read_text(encoding="utf-8")
            except OSError as exc:
                logger.debug("FCM service account file read: %s", exc)
                return None
    if not raw:
        return None
    try:
        info = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not info.get("private_key") or not info.get("client_email"):
        return None
    return info


def is_configured() -> bool:
    return _legacy_configured() or _service_account_info() is not None


def _v1_project_id(info: dict) -> str:
    return (
        info.get("project_id")
        or settings.FIREBASE_PROJECT_ID
        or get_key("FIREBASE_PROJECT_ID")
        or ""
    )


def _get_v1_access_token(info: dict) -> str:
    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account
    except ImportError as exc:
        raise RuntimeError("google-auth 패키지가 필요합니다") from exc

    creds = service_account.Credentials.from_service_account_info(
        info, scopes=[_V1_SCOPE]
    )
    creds.refresh(Request())
    if not creds.token:
        raise RuntimeError("FCM v1 access token 발급 실패")
    return str(creds.token)


async def _send_v1(device_token: str, title: str, body: str) -> dict:
    info = _service_account_info()
    if not info:
        raise RuntimeError("FCM_SERVICE_ACCOUNT_JSON이 설정되지 않았습니다")
    project_id = _v1_project_id(info)
    if not project_id:
        raise RuntimeError("FCM v1 project_id를 확인할 수 없습니다")
    token = _get_v1_access_token(info)
    url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    payload = {
        "message": {
            "token": device_token,
            "notification": {"title": title, "body": body},
        }
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload, timeout=25.0)
        data = resp.json()
    if resp.status_code >= 400:
        raise RuntimeError(f"FCM v1 오류: {data}")
    return {"ok": True, "mode": "v1", "fcm": data}


async def _send_legacy(device_token: str, title: str, body: str) -> dict:
    key = get_key("FCM_SERVER_KEY")
    if not key:
        raise RuntimeError("FCM_SERVER_KEY가 설정되지 않았습니다")
    url = "https://fcm.googleapis.com/fcm/send"
    headers = {"Authorization": f"key={key}", "Content-Type": "application/json"}
    payload = {
        "to": device_token,
        "notification": {"title": title, "body": body},
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload, timeout=20.0)
        data = resp.json()
    if resp.status_code != 200:
        raise RuntimeError(f"FCM Legacy 오류: {data}")
    return {"ok": True, "mode": "legacy", "fcm": data}


async def send_test(device_token: str, title: str, body: str) -> dict:
    if _service_account_info():
        try:
            return await _send_v1(device_token, title, body)
        except Exception as exc:
            logger.warning("FCM v1 failed, trying legacy: %s", exc)
            if _legacy_configured():
                return await _send_legacy(device_token, title, body)
            raise
    if _legacy_configured():
        return await _send_legacy(device_token, title, body)
    raise RuntimeError("FCM v1(서비스 계정) 또는 FCM_SERVER_KEY를 설정하세요")

"""FCM Legacy HTTP API."""

from __future__ import annotations

import httpx

from app.integrations.key_store import get_key


def is_configured() -> bool:
    return bool(get_key("FCM_SERVER_KEY"))


async def send_test(device_token: str, title: str, body: str) -> dict:
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
        raise RuntimeError(f"FCM 오류: {data}")
    return {"ok": True, "fcm": data}

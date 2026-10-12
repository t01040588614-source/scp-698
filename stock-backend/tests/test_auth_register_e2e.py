"""회원가입 SMS → 가입 → 로그인 E2E (ASGI)."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_flow_with_phone_demo(client: AsyncClient, monkeypatch):
    from app.core.config import settings
    from app.integrations import sms_client

    monkeypatch.setattr(settings, "SMS_DEMO_MODE", True)
    monkeypatch.setattr(sms_client, "is_configured", lambda: False)

    status = await client.get("/api/v1/auth/phone/status")
    assert status.status_code == 200
    body = status.json()
    assert body["demo_fallback"] is True or body["configured"] is False

    phone = "01077778888"
    send = await client.post("/api/v1/auth/phone/send", json={"phone": phone})
    assert send.status_code == 200, send.text
    send_json = send.json()
    assert send_json.get("dev_code") or send_json.get("delivery") == "sms"
    code = send_json.get("dev_code")
    if not code:
        pytest.skip("SMS live mode without dev_code in test env")

    verify = await client.post(
        "/api/v1/auth/phone/verify",
        json={"phone": phone, "code": code},
    )
    assert verify.status_code == 200, verify.text
    token = verify.json()["verification_token"]

    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "e2e_test@example.com",
            "username": "e2e_user01",
            "full_name": "테스트 사용자",
            "password": "TestPass1!",
            "phone": phone,
            "birth_date": "1990-05-15",
            "marketing_consent": False,
            "phone_verification_token": token,
            "terms_version": "2026-01",
        },
    )
    assert reg.status_code == 201, reg.text
    assert reg.json()["email"] == "e2e_test@example.com"
    assert reg.json()["phone_verified"] is True

    login = await client.post(
        "/api/v1/auth/login",
        data={"username": "e2e_test@example.com", "password": "TestPass1!"},
    )
    assert login.status_code == 200, login.text
    assert login.json().get("access_token")

"""SMS 발송 — Aligo(국내) · NCP SENS · Twilio."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import re
import time
from typing import Literal

import httpx

from app.core.config import settings
from app.integrations.key_store import get_key

logger = logging.getLogger(__name__)

Provider = Literal["aligo", "ncp", "twilio", "demo"]

_ALIGO_URL = "https://apis.aligo.in/send/"
_NCP_HOST = "https://sens.apigw.ntruss.com"


class SMSDeliveryError(RuntimeError):
    pass


def normalize_provider(raw: str | None) -> Provider:
    p = (raw or "").strip().lower()
    if p in ("ncp", "sens", "naver", "naver_cloud"):
        return "ncp"
    if p == "aligo":
        return "aligo"
    if p == "twilio":
        return "twilio"
    if p == "demo":
        return "demo"
    return "demo"


def active_provider() -> Provider:
    env = normalize_provider(get_key("SMS_PROVIDER"))
    if env != "demo":
        return env
    if _aligo_ready():
        return "aligo"
    if _ncp_ready():
        return "ncp"
    if _twilio_ready():
        return "twilio"
    return "demo"


def _aligo_ready() -> bool:
    return bool(get_key("ALIGO_API_KEY") and get_key("ALIGO_USER_ID") and get_key("ALIGO_SENDER"))


def _ncp_ready() -> bool:
    return bool(
        get_key("NCP_ACCESS_KEY")
        and get_key("NCP_SECRET_KEY")
        and get_key("NCP_SMS_SERVICE_ID")
        and get_key("NCP_SMS_SENDER")
    )


def _twilio_ready() -> bool:
    return bool(
        get_key("TWILIO_ACCOUNT_SID")
        and get_key("TWILIO_AUTH_TOKEN")
        and get_key("TWILIO_SMS_FROM")
    )


def is_configured() -> bool:
    return active_provider() != "demo"


def status_payload() -> dict:
    provider = active_provider()
    demo = settings.SMS_DEMO_MODE or settings.DEBUG
    return {
        "configured": is_configured(),
        "provider": provider,
        "demo_fallback": demo and not is_configured(),
        "label": _provider_label(provider),
    }


def _provider_label(provider: Provider) -> str:
    return {
        "aligo": "Aligo SMS",
        "ncp": "NCP SENS",
        "twilio": "Twilio",
        "demo": "데모(화면 표시)",
    }[provider]


def _digits(phone: str) -> str:
    d = re.sub(r"\D", "", phone)
    if d.startswith("82") and len(d) >= 10:
        d = "0" + d[2:]
    return d


def _to_e164_kr(phone: str) -> str:
    d = _digits(phone)
    if d.startswith("0"):
        return "+82" + d[1:]
    if d.startswith("82"):
        return "+" + d
    return "+82" + d


def _send_aligo(phone: str, message: str) -> None:
    key = get_key("ALIGO_API_KEY")
    user_id = get_key("ALIGO_USER_ID")
    sender = re.sub(r"\D", "", get_key("ALIGO_SENDER"))
    receiver = _digits(phone)
    test_mode = get_key("ALIGO_TEST_MODE").lower() in ("1", "true", "y", "yes")

    data = {
        "key": key,
        "user_id": user_id,
        "sender": sender,
        "receiver": receiver,
        "msg": message,
        "msg_type": "SMS",
        "testmode_yn": "y" if test_mode else "n",
    }
    with httpx.Client(timeout=20.0) as client:
        resp = client.post(_ALIGO_URL, data=data)
        resp.raise_for_status()
        body = resp.json()
    if str(body.get("result_code")) != "1":
        raise SMSDeliveryError(body.get("message") or str(body))


def _ncp_signature(method: str, path: str, timestamp: str, access_key: str, secret_key: str) -> str:
    message = f"{method} {path}\n{timestamp}\n{access_key}"
    digest = hmac.new(secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("utf-8")


def _send_ncp(phone: str, message: str) -> None:
    service_id = get_key("NCP_SMS_SERVICE_ID")
    access_key = get_key("NCP_ACCESS_KEY")
    secret_key = get_key("NCP_SECRET_KEY")
    sender = re.sub(r"\D", "", get_key("NCP_SMS_SENDER"))
    to = _digits(phone)
    path = f"/sms/v2/services/{service_id}/messages"
    url = f"{_NCP_HOST}{path}"
    timestamp = str(int(time.time() * 1000))
    signature = _ncp_signature("POST", path, timestamp, access_key, secret_key)
    payload = {
        "type": "SMS",
        "contentType": "COMM",
        "countryCode": "82",
        "from": sender,
        "content": message,
        "messages": [{"to": to.lstrip("0") if to.startswith("0") else to}],
    }
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-iam-access-key": access_key,
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-apigw-signature-v2": signature,
    }
    with httpx.Client(timeout=20.0) as client:
        resp = client.post(url, headers=headers, content=json.dumps(payload))
        resp.raise_for_status()
        body = resp.json()
    status = body.get("statusCode") or body.get("status")
    if status and str(status) not in ("202", "2000", "OK"):
        raise SMSDeliveryError(body.get("statusMessage") or str(body))


def _send_twilio(phone: str, message: str) -> None:
    sid = get_key("TWILIO_ACCOUNT_SID")
    token = get_key("TWILIO_AUTH_TOKEN")
    from_no = get_key("TWILIO_SMS_FROM")
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    data = {"To": _to_e164_kr(phone), "From": from_no, "Body": message}
    with httpx.Client(timeout=20.0) as client:
        resp = client.post(url, data=data, auth=(sid, token))
        resp.raise_for_status()
        body = resp.json()
    if body.get("error_code"):
        raise SMSDeliveryError(body.get("error_message") or str(body))


def send_sms(phone: str, message: str) -> dict:
    """SMS 발송. 성공 시 provider 정보 반환."""
    provider = active_provider()
    if provider == "demo":
        raise SMSDeliveryError(
            "SMS 연동이 설정되지 않았습니다. 도구 → API 키 연동에서 SMS_PROVIDER와 키를 입력하세요."
        )
    try:
        if provider == "aligo":
            _send_aligo(phone, message)
        elif provider == "ncp":
            _send_ncp(phone, message)
        elif provider == "twilio":
            _send_twilio(phone, message)
    except httpx.HTTPError as exc:
        logger.warning("SMS HTTP error (%s): %s", provider, exc)
        raise SMSDeliveryError(f"SMS 전송 실패 ({provider}): {exc}") from exc
    except SMSDeliveryError:
        raise
    except Exception as exc:
        logger.warning("SMS error (%s): %s", provider, exc)
        raise SMSDeliveryError(f"SMS 전송 실패: {exc}") from exc
    return {"provider": provider, "delivery": "sms"}


def build_verification_message(code: str, brand: str = "MarketLens") -> str:
    return f"[{brand}] 인증번호 [{code}] 3분 내 입력해 주세요."

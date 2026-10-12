"""휴대폰 SMS 인증 — 실제 SMS 연동 + 선택적 데모 폴백."""

from __future__ import annotations

import logging
import re
import secrets
import time

from app.core.config import settings
from app.integrations.sms_client import SMSDeliveryError, build_verification_message, is_configured, send_sms

logger = logging.getLogger(__name__)

_PHONE_RE = re.compile(r"^01[016789]\d{7,8}$")
_CODE_TTL_SEC = 300
_TOKEN_TTL_SEC = 900

_pending: dict[str, tuple[str, float]] = {}
_verified: dict[str, tuple[str, float]] = {}


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("82") and len(digits) >= 10:
        digits = "0" + digits[2:]
    if not _PHONE_RE.fullmatch(digits):
        raise ValueError("올바른 휴대폰 번호 형식이 아닙니다. (010 등 11자리)")
    return digits


def _purge_expired(store: dict[str, tuple[str, float]]) -> None:
    now = time.time()
    expired = [k for k, (_, exp) in store.items() if exp <= now]
    for k in expired:
        store.pop(k, None)


def send_verification_code(phone_raw: str) -> dict:
    phone = normalize_phone(phone_raw)
    _purge_expired(_pending)
    code = f"{secrets.randbelow(1_000_000):06d}"
    _pending[phone] = (code, time.time() + _CODE_TTL_SEC)

    payload: dict = {
        "phone": phone,
        "expires_in_sec": _CODE_TTL_SEC,
        "message": "인증번호가 발송되었습니다.",
        "delivery": "demo",
    }

    if is_configured():
        try:
            meta = send_sms(phone, build_verification_message(code))
            payload["delivery"] = meta.get("delivery", "sms")
            payload["provider"] = meta.get("provider")
            payload["message"] = "휴대폰으로 인증번호를 발송했습니다."
            logger.info("SMS verification sent via %s", meta.get("provider"))
            return payload
        except SMSDeliveryError as exc:
            logger.warning("SMS send failed: %s", exc)
            if not (settings.SMS_DEMO_MODE or settings.DEBUG):
                _pending.pop(phone, None)
                raise ValueError(str(exc)) from exc

    if settings.SMS_DEMO_MODE or settings.DEBUG:
        payload["dev_code"] = code
        payload["message"] = "SMS 미연동 · 화면에 표시된 인증번호를 입력하세요."
        return payload

    _pending.pop(phone, None)
    raise ValueError(
        "SMS 연동이 필요합니다. 상단 메뉴 도구 → API 키 연동에서 SMS(Aligo·NCP·Twilio)를 설정하거나 "
        "관리자에게 SMS_DEMO_MODE=true 설정을 요청하세요."
    )


def verify_code(phone_raw: str, code: str) -> dict:
    phone = normalize_phone(phone_raw)
    _purge_expired(_pending)
    _purge_expired(_verified)

    entry = _pending.get(phone)
    if not entry:
        raise ValueError("인증번호를 먼저 요청하세요.")
    expected, expires = entry
    if time.time() > expires:
        _pending.pop(phone, None)
        raise ValueError("인증번호가 만료되었습니다. 다시 요청하세요.")
    if (code or "").strip() != expected:
        raise ValueError("인증번호가 올바르지 않습니다.")

    token = secrets.token_urlsafe(32)
    _verified[phone] = (token, time.time() + _TOKEN_TTL_SEC)
    _pending.pop(phone, None)
    return {
        "phone": phone,
        "verification_token": token,
        "expires_in_sec": _TOKEN_TTL_SEC,
    }


def consume_verification_token(phone_raw: str, token: str) -> bool:
    phone = normalize_phone(phone_raw)
    _purge_expired(_verified)
    entry = _verified.get(phone)
    if not entry:
        return False
    expected, expires = entry
    if time.time() > expires or (token or "").strip() != expected:
        return False
    _verified.pop(phone, None)
    return True

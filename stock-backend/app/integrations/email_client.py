"""SMTP 비밀번호 재설정 메일."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM_EMAIL)


def status_payload() -> dict:
    return {
        "configured": is_configured(),
        "from": settings.SMTP_FROM_EMAIL or None,
        "host": settings.SMTP_HOST or None,
    }


def send_password_reset_email(*, to_email: str, reset_url: str) -> None:
    if not is_configured():
        raise RuntimeError("SMTP가 설정되지 않았습니다")
    msg = EmailMessage()
    msg["Subject"] = "[MarketLens] 비밀번호 재설정"
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(
        f"비밀번호 재설정을 요청하셨습니다.\n\n"
        f"아래 링크를 클릭해 새 비밀번호를 설정하세요 (1시간 유효):\n\n"
        f"{reset_url}\n\n"
        f"요청하지 않으셨다면 이 메일을 무시하세요.\n"
    )
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            user = settings.SMTP_USER
            password = settings.SMTP_PASSWORD
            if user and password:
                smtp.login(user, password)
            smtp.send_message(msg)
    except Exception as exc:
        logger.warning("SMTP send failed: %s", exc)
        raise RuntimeError("비밀번호 재설정 메일 발송에 실패했습니다") from exc

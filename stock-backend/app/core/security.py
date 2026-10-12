from datetime import timedelta

import bcrypt
from jose import jwt

from app.core.config import settings
from app.core.datetime_utils import utc_now


def create_access_token(subject: str | dict, expires_delta: timedelta | None = None) -> str:
    to_encode = {"exp": utc_now() + (expires_delta or timedelta(minutes=15))}
    to_encode.update(subject if isinstance(subject, dict) else {"sub": str(subject)})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

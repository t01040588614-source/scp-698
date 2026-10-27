"""인증 API — /api/v1/auth (register, login, me)."""

import logging
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.integrations import email_client
from app.integrations.sms_client import status_payload
from app.models.user import User
from app.schemas.broker import UserKisCredentialBody, UserKisCredentialStatus
from app.schemas.password_reset import (
    PasswordForgotRequest,
    PasswordForgotResponse,
    PasswordResetRequest,
    PasswordResetResponse,
)
from app.schemas.phone_auth import (
    PhoneSendRequest,
    PhoneSendResponse,
    PhoneSmsStatusResponse,
    PhoneVerifyRequest,
    PhoneVerifyResponse,
)
from app.schemas.token import RefreshTokenRequest, RefreshTokenResponse, Token
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.auth_tokens import issue_auth_token_pair
from app.services.broker_credential_service import BrokerCredentialService
from app.services.login_rate_limit import (
    assert_login_allowed,
    record_login_failure,
    record_login_success,
)
from app.services.password_reset_db import (
    consume_reset_token,
    issue_reset_token,
    send_reset_link,
)
from app.services.phone_verification import (
    consume_verification_token,
    normalize_phone,
    send_verification_code,
    verify_code,
)
from app.services.refresh_token_service import revoke_refresh_token, rotate_refresh_token
from app.services.user_service import UserService

logger = logging.getLogger(__name__)

router = APIRouter()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    """OAuth2 username 필드에 이메일을 넣어 로그인 (프론트와 동일)."""
    user_service = UserService(db)
    user = await user_service.get_by_email(email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


def _assert_adult(birth: date) -> None:
    today = datetime.now(UTC).date()
    age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    if age < 14:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="만 14세 이상만 가입할 수 있습니다",
        )


@router.get("/phone/status", response_model=PhoneSmsStatusResponse)
async def phone_sms_status():
    return PhoneSmsStatusResponse(**status_payload())


@router.post("/phone/send", response_model=PhoneSendResponse)
async def send_phone_code(body: PhoneSendRequest):
    try:
        payload = send_verification_code(body.phone)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return PhoneSendResponse(**payload)


@router.post("/phone/verify", response_model=PhoneVerifyResponse)
async def verify_phone_code(body: PhoneVerifyRequest):
    try:
        payload = verify_code(body.phone, body.code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return PhoneVerifyResponse(**payload)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    _assert_adult(user_in.birth_date)

    try:
        phone = normalize_phone(user_in.phone)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not consume_verification_token(phone, user_in.phone_verification_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="휴대폰 인증이 만료되었거나 유효하지 않습니다. 다시 인증해 주세요.",
        )

    if await user_service.get_by_email(user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 이메일입니다",
        )
    if await user_service.get_by_username(user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 사용자명입니다",
        )
    if await user_service.get_by_phone(phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 휴대폰 번호입니다",
        )

    now = datetime.now(UTC)
    return await user_service.create(user_in, phone=phone, terms_agreed_at=now)


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    email = (form_data.username or "").strip()
    assert_login_allowed(request, email)
    user = await authenticate_user(db, email, form_data.password)
    if not user:
        record_login_failure(request, email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    record_login_success(request, email)
    return await issue_auth_token_pair(db, user)


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_access_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    rotated = await rotate_refresh_token(db, body.refresh_token)
    if not rotated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="리프레시 토큰이 만료되었거나 유효하지 않습니다.",
        )
    user, new_refresh = rotated
    access = create_access_token(
        subject={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return RefreshTokenResponse(
        access_token=access,
        refresh_token=new_refresh,
    )


@router.post("/logout")
async def logout(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    await revoke_refresh_token(db, body.refresh_token)
    return {"ok": True}


@router.get("/email/status")
async def email_status():
    return email_client.status_payload()


@router.post("/password/forgot", response_model=PasswordForgotResponse)
async def forgot_password(body: PasswordForgotRequest, db: AsyncSession = Depends(get_db)):
    """등록 여부와 관계없이 동일 응답(계정 열거 방지). DEBUG 시 dev_reset_token."""
    user_service = UserService(db)
    user = await user_service.get_by_email(body.email.strip())
    dev_token: str | None = None
    if user:
        dev_token = await issue_reset_token(db, user)
        try:
            await send_reset_link(user, dev_token)
        except RuntimeError as exc:
            if not settings.DEBUG:
                logger.warning("password reset mail: %s", exc)

    payload = PasswordForgotResponse(
        message="등록된 이메일이면 비밀번호 재설정 안내가 발송됩니다. 메일함을 확인해 주세요.",
        dev_reset_token=dev_token if settings.DEBUG else None,
    )
    return payload


@router.post("/password/reset", response_model=PasswordResetResponse)
async def reset_password(body: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    email = await consume_reset_token(db, body.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="재설정 링크가 만료되었거나 유효하지 않습니다.",
        )

    user_service = UserService(db)
    user = await user_service.get_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="재설정 링크가 만료되었거나 유효하지 않습니다.",
        )

    await user_service.update(user, UserUpdate(password=body.password))
    return PasswordResetResponse(
        message="비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.",
    )


def _mask_account_no(account_no: str | None) -> str | None:
    if not account_no:
        return None
    digits = account_no.replace("-", "")
    if len(digits) < 4:
        return "****"
    return f"{digits[:2]}****{digits[-2:]}"


@router.get("/me/broker/kis", response_model=UserKisCredentialStatus)
async def read_my_kis_broker(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await BrokerCredentialService(db).get_kis(current_user.id)
    if not row:
        return UserKisCredentialStatus(
            configured=False,
            integrationId="kis_korea",
            accountMasked=None,
            useMock=False,
            verifiedAt=None,
        )
    verified = row.verified_at.isoformat() if row.verified_at else None
    return UserKisCredentialStatus(
        configured=True,
        integrationId="kis_korea",
        accountMasked=_mask_account_no(row.account_no),
        useMock=(row.use_mock or "").lower() in ("1", "true", "yes"),
        verifiedAt=verified,
    )


@router.put("/me/broker/kis", response_model=UserKisCredentialStatus)
async def save_my_kis_broker(
    body: UserKisCredentialBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.integrations import kis_client

    try:
        await kis_client.verify_credentials(
            body.app_key,
            body.app_secret,
            use_mock=body.use_mock,
            account_no=body.account_no,
            account_product_code=body.account_product_code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"KIS 검증 실패: {exc}",
        ) from exc

    row = await BrokerCredentialService(db).upsert_kis(current_user.id, body)
    verified = row.verified_at.isoformat() if row.verified_at else None
    return UserKisCredentialStatus(
        configured=True,
        integrationId="kis_korea",
        accountMasked=_mask_account_no(row.account_no),
        useMock=body.use_mock,
        verifiedAt=verified,
    )


@router.get("/me/broker/kis/snapshot")
async def read_my_kis_snapshot(
    current_user: User = Depends(get_current_user),
):
    from app.services.kis_portfolio_sync import kis_portfolio_sync

    cached = kis_portfolio_sync.get_cached(current_user.id)
    if cached:
        return {"ok": True, "source": "cache", **cached}
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="동기화된 KIS 스냅샷이 없습니다. POST /me/broker/kis/sync 를 호출하세요.",
    )


@router.post("/me/broker/kis/sync")
async def sync_my_kis_snapshot(
    current_user: User = Depends(get_current_user),
):
    from app.services.kis_portfolio_sync import sync_user_kis

    try:
        snap = await sync_user_kis(current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"KIS 동기화 실패: {exc}",
        ) from exc
    return {"ok": True, "source": "live", **snap}

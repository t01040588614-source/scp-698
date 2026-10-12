"""인증 API — /api/v1/auth (register, login, me)."""

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import User
from app.integrations.sms_client import status_payload
from app.schemas.phone_auth import (
    PhoneSendRequest,
    PhoneSendResponse,
    PhoneSmsStatusResponse,
    PhoneVerifyRequest,
    PhoneVerifyResponse,
)
from app.schemas.token import Token
from app.schemas.broker import UserKisCredentialBody, UserKisCredentialStatus
from app.schemas.user import UserCreate, UserResponse
from app.services.broker_credential_service import BrokerCredentialService
from app.services.phone_verification import (
    consume_verification_token,
    normalize_phone,
    send_verification_code,
    verify_code,
)
from app.services.user_service import UserService

router = APIRouter()


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User | None:
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
    today = datetime.now(timezone.utc).date()
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

    now = datetime.now(timezone.utc)
    return await user_service.create(user_in, phone=phone, terms_agreed_at=now)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        subject={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


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
        return UserKisCredentialStatus(configured=False)
    verified = row.verified_at.isoformat() if row.verified_at else None
    return UserKisCredentialStatus(
        configured=True,
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
        accountMasked=_mask_account_no(row.account_no),
        useMock=body.use_mock,
        verifiedAt=verified,
    )

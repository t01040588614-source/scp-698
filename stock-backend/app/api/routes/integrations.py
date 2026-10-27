"""API 키 연동 — 상태 조회·저장·적용."""

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.integrations import kis_client
from app.integrations.key_store import keys_file_path, reload_file_keys, save_keys
from app.integrations.registry import list_integrations
from app.integrations.sms_client import SMSDeliveryError, send_sms
from app.schemas.broker import KisVerifyRequest, KisVerifyResponse
from app.schemas.integrations import FcmTestBody, IntegrationKeysUpdate, SmsTestBody
from app.services.market_data import market_data
from app.services.phone_verification import normalize_phone

router = APIRouter(tags=["연동 (API Key)"])


@router.get("")
async def get_integrations():
    return {
        "allowUiSave": settings.integrations_allow_ui_save(),
        "keysFile": str(keys_file_path()),
        "integrations": list_integrations(),
        "market": market_data.status(),
    }


@router.put("/keys")
async def put_integration_keys(body: IntegrationKeysUpdate):
    try:
        saved = save_keys(body.keys)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    kis_client.invalidate_token()
    reload_file_keys()
    market_data.schedule_refresh()
    return {
        "ok": True,
        "savedKeys": list(saved.keys()),
        "integrations": list_integrations(),
    }


@router.post("/apply")
async def apply_integrations():
    """키 변경 후 시세·토큰 재적용."""
    kis_client.invalidate_token()
    reload_file_keys()
    await market_data.refresh()
    return {"ok": True, "market": market_data.status()}


@router.post("/kis/verify", response_model=KisVerifyResponse)
async def verify_kis_credentials(body: KisVerifyRequest):
    """가입·연동 마법사 — KIS App Key/Secret·계좌 검증 (저장하지 않음)."""
    try:
        result = await kis_client.verify_credentials(
            body.app_key,
            body.app_secret,
            use_mock=body.use_mock,
            account_no=body.account_no,
            account_product_code=body.account_product_code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"KIS 연동 실패: {exc}") from exc
    return KisVerifyResponse(**result)


@router.post("/sms/test")
async def test_sms(body: SmsTestBody):
    try:
        phone = normalize_phone(body.phone)
        result = send_sms(phone, body.message)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SMSDeliveryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, **result, "phone": phone}


@router.post("/fcm/test")
async def test_fcm(body: FcmTestBody):
    from app.integrations.fcm_client import send_test

    try:
        result = await send_test(body.device_token, body.title, body.body)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result

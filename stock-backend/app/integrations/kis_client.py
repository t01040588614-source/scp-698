"""한국투자증권 Open API — 토큰 + 국내 현재가."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

import httpx

from app.integrations.key_store import get_key

logger = logging.getLogger(__name__)

_token: str | None = None
_token_expires: datetime | None = None
_token_lock = asyncio.Lock()


def _base_url() -> str:
    mock = get_key("KIS_USE_MOCK").lower() in ("1", "true", "yes")
    if mock:
        return "https://openapivts.koreainvestment.com:29443"
    return "https://openapi.koreainvestment.com:9443"


def is_configured() -> bool:
    return bool(get_key("KIS_APP_KEY") and get_key("KIS_APP_SECRET"))


async def _fetch_token(client: httpx.AsyncClient) -> str:
    global _token, _token_expires
    app_key = get_key("KIS_APP_KEY")
    app_secret = get_key("KIS_APP_SECRET")
    url = f"{_base_url()}/oauth2/tokenP"
    resp = await client.post(
        url,
        json={"grant_type": "client_credentials", "appkey": app_key, "appsecret": app_secret},
        timeout=20.0,
    )
    resp.raise_for_status()
    data = resp.json()
    access = data.get("access_token")
    if not access:
        raise RuntimeError(f"KIS token missing: {data}")
    _token = access
    # expires in seconds or datetime string
    exp = data.get("access_token_token_expired")
    if isinstance(exp, str):
        try:
            _token_expires = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        except ValueError:
            _token_expires = datetime.now(timezone.utc) + timedelta(hours=12)
    else:
        _token_expires = datetime.now(timezone.utc) + timedelta(hours=12)
    return access


async def get_access_token() -> str:
    global _token, _token_expires
    if not is_configured():
        raise RuntimeError("KIS keys not configured")
    async with _token_lock:
        now = datetime.now(timezone.utc)
        if _token and _token_expires and _token_expires > now + timedelta(minutes=2):
            return _token
        async with httpx.AsyncClient() as client:
            return await _fetch_token(client)


def invalidate_token() -> None:
    global _token, _token_expires
    _token = None
    _token_expires = None


def _tr_id_price() -> str:
    mock = get_key("KIS_USE_MOCK").lower() in ("1", "true", "yes")
    return "FHKST01010100" if not mock else "FHKST01010100"


async def inquire_price(symbol: str) -> dict | None:
    """종목코드 6자리 → normalized stock dict."""
    sym = symbol.strip().zfill(6)
    app_key = get_key("KIS_APP_KEY")
    app_secret = get_key("KIS_APP_SECRET")
    token = await get_access_token()
    url = f"{_base_url()}/uapi/domestic-stock/v1/quotations/inquire-price"
    headers = {
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": _tr_id_price(),
        "custtype": "P",
    }
    params = {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": sym}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, params=params, timeout=15.0)
        if resp.status_code == 401:
            invalidate_token()
            token = await get_access_token()
            headers["authorization"] = f"Bearer {token}"
            resp = await client.get(url, headers=headers, params=params, timeout=15.0)
        if resp.status_code != 200:
            logger.debug("KIS price %s HTTP %s", sym, resp.status_code)
            return None
        body = resp.json()
        if body.get("rt_cd") not in (None, "0", 0):
            logger.debug("KIS price %s rt_cd=%s", sym, body.get("rt_cd"))
            return None
        out = body.get("output") or {}
        try:
            price = float(out.get("stck_prpr") or 0)
        except (TypeError, ValueError):
            return None
        if price <= 0:
            return None
        try:
            change = float(out.get("prdy_vrss") or 0)
            change_percent = float(out.get("prdy_ctrt") or 0)
            volume = int(float(out.get("acml_vol") or 0))
            high = float(out.get("stck_hgpr") or price)
            low = float(out.get("stck_lwpr") or price)
            open_p = float(out.get("stck_oprc") or price)
            prev = float(out.get("stck_prdy_clpr") or price - change)
        except (TypeError, ValueError):
            change = change_percent = 0.0
            volume = 0
            high = low = open_p = prev = price
        return {
            "symbol": sym,
            "price": price,
            "change": change,
            "change_percent": change_percent,
            "volume": volume,
            "high": high,
            "low": low,
            "open": open_p,
            "previous_close": prev,
            "data_source": "kis",
        }


def _base_url_for_mock(use_mock: bool) -> str:
    if use_mock:
        return "https://openapivts.koreainvestment.com:29443"
    return "https://openapi.koreainvestment.com:9443"


async def _fetch_token_with_keys(
    client: httpx.AsyncClient,
    app_key: str,
    app_secret: str,
    use_mock: bool,
) -> str:
    url = f"{_base_url_for_mock(use_mock)}/oauth2/tokenP"
    resp = await client.post(
        url,
        json={"grant_type": "client_credentials", "appkey": app_key, "appsecret": app_secret},
        timeout=20.0,
    )
    resp.raise_for_status()
    data = resp.json()
    access = data.get("access_token")
    if not access:
        raise RuntimeError(f"KIS token missing: {data}")
    return access


def _mask_account(account_no: str) -> str | None:
    digits = account_no.strip().replace("-", "")
    if len(digits) < 4:
        return None
    return f"{digits[:2]}****{digits[-2:]}"


async def verify_credentials(
    app_key: str,
    app_secret: str,
    *,
    use_mock: bool = False,
    account_no: str = "",
    account_product_code: str = "01",
) -> dict:
    """가입·연동 테스트 — 저장 없이 토큰·(선택) 잔고 확인."""
    app_key = app_key.strip()
    app_secret = app_secret.strip()
    if not app_key or not app_secret:
        raise ValueError("App Key와 App Secret을 입력하세요.")

    mode = "mock" if use_mock else "real"
    base = _base_url_for_mock(use_mock)
    cash_balance: float | None = None
    account_masked = _mask_account(account_no) if account_no else None

    async with httpx.AsyncClient() as client:
        token = await _fetch_token_with_keys(client, app_key, app_secret, use_mock)

        cano = account_no.strip().replace("-", "")
        if len(cano) >= 8:
            cano8 = cano[:8]
            prdt = (account_product_code or "01").strip()[:2]
            tr_id = "VTTC8434R" if use_mock else "TTTC8434R"
            url = f"{base}/uapi/domestic-stock/v1/trading/inquire-balance"
            headers = {
                "authorization": f"Bearer {token}",
                "appkey": app_key,
                "appsecret": app_secret,
                "tr_id": tr_id,
                "custtype": "P",
            }
            params = {
                "CANO": cano8,
                "ACNT_PRDT_CD": prdt,
                "AFHR_FLPR_YN": "N",
                "OFL_YN": "",
                "INQR_DVSN": "02",
                "UNPR_DVSN": "01",
                "FUND_STTL_ICLD_YN": "N",
                "FNCG_AMT_AUTO_RDPT_YN": "N",
                "PRCS_DVSN": "01",
                "CTX_AREA_FK100": "",
                "CTX_AREA_NK100": "",
            }
            try:
                resp = await client.get(url, headers=headers, params=params, timeout=20.0)
                if resp.status_code == 200:
                    body = resp.json()
                    if body.get("rt_cd") in (None, "0", 0):
                        out2 = body.get("output2") or []
                        if isinstance(out2, list) and out2:
                            try:
                                cash_balance = float(out2[0].get("dnca_tot_amt") or 0)
                            except (TypeError, ValueError):
                                cash_balance = None
                        account_masked = _mask_account(cano8 + prdt)
            except Exception as exc:
                logger.debug("KIS balance skip: %s", exc)

    message = "한국투자증권 Open API 인증에 성공했습니다."
    if account_no and cash_balance is not None:
        message += f" 예수금(총): {cash_balance:,.0f}원 기준으로 확인되었습니다."
    elif account_no:
        message += " 계좌번호는 확인했으나 잔고 조회는 권한·계좌상태를 확인해 주세요."

    return {
        "ok": True,
        "mode": mode,
        "message": message,
        "cashBalance": cash_balance,
        "accountMasked": account_masked,
    }


async def inquire_prices(symbols: list[str], concurrency: int = 8) -> list[dict]:
    sem = asyncio.Semaphore(concurrency)

    async def one(sym: str) -> dict | None:
        async with sem:
            try:
                return await inquire_price(sym)
            except Exception as exc:
                logger.debug("KIS %s: %s", sym, exc)
                return None

    results = await asyncio.gather(*(one(s) for s in symbols))
    return [r for r in results if r]

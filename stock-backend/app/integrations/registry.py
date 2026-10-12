"""연동 정의 — 필요 키가 채워지면 active."""

from __future__ import annotations

from dataclasses import dataclass

from app.integrations.key_store import get_key, key_source, mask_value
from app.integrations.sms_client import is_configured as sms_is_configured


@dataclass(frozen=True)
class KeyField:
    key: str
    label: str
    required: bool = True
    secret: bool = True


@dataclass(frozen=True)
class IntegrationDef:
    id: str
    name: str
    description: str
    fields: tuple[KeyField, ...]
    docs_url: str = ""


INTEGRATIONS: tuple[IntegrationDef, ...] = (
    IntegrationDef(
        id="kis_korea",
        name="한국투자증권 Open API",
        description="한국 주식 실시간 시세 (App Key/Secret 입력 시 Yahoo·FDR 대신 우선 사용)",
        fields=(
            KeyField("KIS_APP_KEY", "App Key (또는 KOREA_STOCK_API_KEY)"),
            KeyField("KIS_APP_SECRET", "App Secret"),
            KeyField("KIS_USE_MOCK", "모의투자 (true/1 이면 VTS)", required=False, secret=False),
            KeyField("KIS_ACCOUNT_NO", "계좌번호 (8자리, 잔고·체결 연동 시)", required=False),
        ),
        docs_url="https://apiportal.koreainvestment.com/",
    ),
    IntegrationDef(
        id="alpha_vantage_us",
        name="Alpha Vantage (미국)",
        description="미국 주식 시세 — API 키 있으면 Yahoo보다 우선",
        fields=(KeyField("ALPHA_VANTAGE_API_KEY", "API Key"),),
        docs_url="https://www.alphavantage.co/support/#api-key",
    ),
    IntegrationDef(
        id="finnhub_us",
        name="Finnhub (미국)",
        description="미국 주식 시세 — US_STOCK_API_KEY 또는 FINNHUB_API_KEY",
        fields=(KeyField("FINNHUB_API_KEY", "API Token (또는 US_STOCK_API_KEY)"),),
        docs_url="https://finnhub.io/",
    ),
    IntegrationDef(
        id="google_oauth",
        name="Google 로그인",
        description="Client ID/Secret 입력 시 /auth/oauth/google 로그인 활성",
        fields=(
            KeyField("GOOGLE_CLIENT_ID", "Client ID", secret=False),
            KeyField("GOOGLE_CLIENT_SECRET", "Client Secret"),
        ),
        docs_url="https://console.cloud.google.com/apis/credentials",
    ),
    IntegrationDef(
        id="kakao_oauth",
        name="Kakao 로그인",
        description="REST API 키 + (선택) Client Secret",
        fields=(
            KeyField("KAKAO_REST_API_KEY", "REST API Key", secret=False),
            KeyField("KAKAO_CLIENT_SECRET", "Client Secret", required=False),
        ),
        docs_url="https://developers.kakao.com/",
    ),
    IntegrationDef(
        id="fcm_push",
        name="Firebase Cloud Messaging",
        description="푸시 알림 — Server Key 입력 시 테스트 발송 API 사용 가능",
        fields=(KeyField("FCM_SERVER_KEY", "Server Key (Legacy)"),),
        docs_url="https://firebase.google.com/docs/cloud-messaging",
    ),
    IntegrationDef(
        id="news_api",
        name="News API",
        description="글로벌 뉴스 헤드라인 (content API 보강)",
        fields=(KeyField("NEWS_API_KEY", "API Key"),),
        docs_url="https://newsapi.org/",
    ),
    IntegrationDef(
        id="ai_chat",
        name="AI Assistant",
        description="OpenAI 또는 Gemini API 키 입력 시 우측 하단 AI 챗봇 활성",
        fields=(
            KeyField("OPENAI_API_KEY", "OpenAI API Key", required=False),
            KeyField("GEMINI_API_KEY", "Google Gemini API Key", required=False),
            KeyField(
                "AI_CHAT_PROVIDER",
                "openai | gemini (비우면 OpenAI 우선)",
                required=False,
                secret=False,
            ),
            KeyField("OPENAI_MODEL", "OpenAI 모델 (기본 gpt-4o-mini)", required=False, secret=False),
            KeyField("GEMINI_MODEL", "Gemini 모델 (기본 gemini-2.0-flash)", required=False, secret=False),
            KeyField(
                "OPENAI_BASE_URL",
                "OpenAI 호환 Base URL (선택)",
                required=False,
                secret=False,
            ),
        ),
        docs_url="https://platform.openai.com/api-keys",
    ),
    IntegrationDef(
        id="sms_auth",
        name="SMS 본인인증 (회원가입)",
        description="Aligo · NCP SENS · Twilio — SMS_PROVIDER 선택 후 해당 키 입력",
        fields=(
            KeyField("SMS_PROVIDER", "aligo | ncp | twilio (비우면 키로 자동)", required=False, secret=False),
            KeyField("ALIGO_API_KEY", "Aligo API Key", required=False),
            KeyField("ALIGO_USER_ID", "Aligo user_id", required=False, secret=False),
            KeyField("ALIGO_SENDER", "Aligo 발신번호 (등록된 번호)", required=False, secret=False),
            KeyField("ALIGO_TEST_MODE", "Aligo 테스트(y/n)", required=False, secret=False),
            KeyField("NCP_SMS_SERVICE_ID", "NCP SENS Service ID", required=False, secret=False),
            KeyField("NCP_ACCESS_KEY", "NCP Access Key", required=False),
            KeyField("NCP_SECRET_KEY", "NCP Secret Key", required=False),
            KeyField("NCP_SMS_SENDER", "NCP 발신번호", required=False, secret=False),
            KeyField("TWILIO_ACCOUNT_SID", "Twilio Account SID", required=False, secret=False),
            KeyField("TWILIO_AUTH_TOKEN", "Twilio Auth Token", required=False),
            KeyField("TWILIO_SMS_FROM", "Twilio 발신 번호 (+1…)", required=False, secret=False),
        ),
        docs_url="https://smartsms.aligo.in/admin/api/spec.html",
    ),
)


def _field_configured(field: KeyField) -> bool:
    return bool(get_key(field.key))


def integration_configured(defn: IntegrationDef) -> bool:
    if defn.id == "sms_auth":
        return sms_is_configured()
    if defn.id == "ai_chat":
        return bool(get_key("OPENAI_API_KEY") or get_key("GEMINI_API_KEY"))
    required = [f for f in defn.fields if f.required]
    return all(_field_configured(f) for f in required)


def integration_to_dict(defn: IntegrationDef) -> dict:
    fields_out = []
    for f in defn.fields:
        val = get_key(f.key)
        fields_out.append(
            {
                "key": f.key,
                "label": f.label,
                "required": f.required,
                "secret": f.secret,
                "configured": bool(val),
                "source": key_source(f.key),
                "masked": mask_value(val) if f.secret else (val[:20] + "…" if len(val) > 24 else val or None),
            }
        )
    configured = integration_configured(defn)
    return {
        "id": defn.id,
        "name": defn.name,
        "description": defn.description,
        "docsUrl": defn.docs_url,
        "configured": configured,
        "active": configured,
        "fields": fields_out,
    }


def list_integrations() -> list[dict]:
    return [integration_to_dict(d) for d in INTEGRATIONS]


def kis_enabled() -> bool:
    return integration_configured(next(d for d in INTEGRATIONS if d.id == "kis_korea"))


def alpha_vantage_enabled() -> bool:
    return bool(get_key("ALPHA_VANTAGE_API_KEY"))


def finnhub_enabled() -> bool:
    return bool(get_key("FINNHUB_API_KEY"))


def google_oauth_enabled() -> bool:
    return integration_configured(next(d for d in INTEGRATIONS if d.id == "google_oauth"))


def kakao_oauth_enabled() -> bool:
    return bool(get_key("KAKAO_REST_API_KEY"))


def fcm_enabled() -> bool:
    return bool(get_key("FCM_SERVER_KEY"))


def news_api_enabled() -> bool:
    return bool(get_key("NEWS_API_KEY"))


def ai_chat_enabled() -> bool:
    return bool(get_key("OPENAI_API_KEY") or get_key("GEMINI_API_KEY"))

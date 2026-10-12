import json
from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Stock API"
    DEBUG: bool = False
    SMS_DEMO_MODE: bool = False
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://localhost/stockdb"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    JWT_SECRET_KEY: str = "change-this-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # 주식·연동 API (비워두면 무료 Yahoo/FDR, UI/JSON 저장 가능)
    KOREA_STOCK_API_KEY: str = ""
    KOREA_STOCK_API_SECRET: str = ""
    US_STOCK_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    KIS_APP_KEY: str = ""
    KIS_APP_SECRET: str = ""
    KIS_ACCOUNT_NO: str = ""
    KIS_USE_MOCK: str = ""
    FINNHUB_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    KAKAO_REST_API_KEY: str = ""
    KAKAO_CLIENT_SECRET: str = ""
    FCM_SERVER_KEY: str = ""
    NEWS_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    AI_CHAT_PROVIDER: str = ""
    OPENAI_MODEL: str = ""
    GEMINI_MODEL: str = ""
    OPENAI_BASE_URL: str = ""
    SMS_PROVIDER: str = ""
    ALIGO_API_KEY: str = ""
    ALIGO_USER_ID: str = ""
    ALIGO_SENDER: str = ""
    ALIGO_TEST_MODE: str = ""
    NCP_SMS_SERVICE_ID: str = ""
    NCP_ACCESS_KEY: str = ""
    NCP_SECRET_KEY: str = ""
    NCP_SMS_SENDER: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_SMS_FROM: str = ""
    INTEGRATIONS_KEYS_FILE: str = "data/integration_keys.json"
    INTEGRATIONS_ALLOW_UI_SAVE: bool | None = None
    OAUTH_BACKEND_BASE: str = "http://127.0.0.1:8000"
    OAUTH_FRONTEND_BASE: str = "http://localhost:3000"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 300

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @field_validator("INTEGRATIONS_ALLOW_UI_SAVE", mode="before")
    @classmethod
    def empty_optional_bool(cls, value: Any) -> bool | None:
        if value is None or (isinstance(value, str) and value.strip() == ""):
            return None
        return value

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v) for v in value]
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return [str(v) for v in parsed]
                except json.JSONDecodeError:
                    pass
            return [part.strip() for part in raw.split(",") if part.strip()]
        return [str(value)]

    def integrations_allow_ui_save(self) -> bool:
        if self.INTEGRATIONS_ALLOW_UI_SAVE is not None:
            return bool(self.INTEGRATIONS_ALLOW_UI_SAVE)
        return bool(self.DEBUG)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def reload_settings() -> Settings:
    get_settings.cache_clear()
    return get_settings()

from pydantic import BaseModel, Field


class IntegrationKeysUpdate(BaseModel):
    keys: dict[str, str] = Field(default_factory=dict)


class FcmTestBody(BaseModel):
    device_token: str = Field(..., min_length=10)
    title: str = "주식대시 테스트"
    body: str = "FCM 연동이 활성화되었습니다."


class SmsTestBody(BaseModel):
    phone: str = Field(..., min_length=9, max_length=20)
    message: str = Field(default="MarketLens SMS 연동 테스트입니다.", max_length=160)

from pydantic import BaseModel, Field


class PhoneSendRequest(BaseModel):
    phone: str = Field(..., min_length=9, max_length=20)


class PhoneSendResponse(BaseModel):
    phone: str
    expires_in_sec: int
    message: str
    delivery: str = "demo"
    provider: str | None = None
    dev_code: str | None = None


class PhoneSmsStatusResponse(BaseModel):
    configured: bool
    provider: str
    demo_fallback: bool
    label: str


class PhoneVerifyRequest(BaseModel):
    phone: str
    code: str = Field(..., min_length=6, max_length=6)


class PhoneVerifyResponse(BaseModel):
    phone: str
    verification_token: str
    expires_in_sec: int

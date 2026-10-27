from pydantic import BaseModel, EmailStr, Field


class PasswordForgotRequest(BaseModel):
    email: EmailStr


class PasswordForgotResponse(BaseModel):
    message: str
    dev_reset_token: str | None = None


class PasswordResetRequest(BaseModel):
    token: str = Field(..., min_length=16)
    password: str = Field(..., min_length=8)


class PasswordResetResponse(BaseModel):
    message: str

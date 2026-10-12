from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str | None = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    phone: str = Field(..., min_length=9, max_length=20)
    birth_date: date
    marketing_consent: bool = False
    phone_verification_token: str = Field(..., min_length=16)
    terms_version: str = Field(default="2026-01", max_length=32)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    full_name: str | None = None
    password: str | None = Field(None, min_length=8)


class UserResponse(UserBase):
    id: int
    phone: str | None = None
    birth_date: date | None = None
    phone_verified: bool = False
    marketing_consent: bool = False
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

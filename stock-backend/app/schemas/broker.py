from pydantic import BaseModel, ConfigDict, Field

_POPULATE = ConfigDict(populate_by_name=True)  # pyright: ignore[reportCallIssue]
_ALIAS_CFG = ConfigDict(populate_by_name=True, ser_json_by_alias=True)  # pyright: ignore[reportCallIssue]


class KisVerifyRequest(BaseModel):
    app_key: str = Field(..., alias="appKey", min_length=8)
    app_secret: str = Field(..., alias="appSecret", min_length=8)
    account_no: str = Field(default="", alias="accountNo")
    account_product_code: str = Field(default="01", alias="accountProductCode")
    use_mock: bool = Field(default=False, alias="useMock")

    model_config = _POPULATE


class KisVerifyResponse(BaseModel):
    ok: bool
    mode: str
    message: str
    cash_balance: float | None = Field(None, alias="cashBalance")
    account_masked: str | None = Field(None, alias="accountMasked")

    model_config = _ALIAS_CFG


class UserKisCredentialBody(BaseModel):
    app_key: str = Field(..., alias="appKey", min_length=8)
    app_secret: str = Field(..., alias="appSecret", min_length=8)
    account_no: str = Field(default="", alias="accountNo")
    account_product_code: str = Field(default="01", alias="accountProductCode")
    use_mock: bool = Field(default=False, alias="useMock")

    model_config = _POPULATE


class UserKisCredentialStatus(BaseModel):
    configured: bool
    integration_id: str = Field("kis_korea", alias="integrationId")
    account_masked: str | None = Field(None, alias="accountMasked")
    use_mock: bool = Field(False, alias="useMock")
    verified_at: str | None = Field(None, alias="verifiedAt")

    model_config = _ALIAS_CFG

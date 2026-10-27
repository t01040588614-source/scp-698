from pydantic import BaseModel, Field


class WatchlistEntryBody(BaseModel):
    symbol: str
    market: str
    name: str = ""


class WatchlistSyncBody(BaseModel):
    items: list[WatchlistEntryBody] = Field(default_factory=list)


class WatchlistEntryResponse(BaseModel):
    symbol: str
    market: str
    name: str
    sort_order: int = 0

    model_config = {"from_attributes": True}


class PriceAlertBody(BaseModel):
    symbol: str
    market: str
    name: str = ""
    target_price: float
    direction: str = "above"
    enabled: bool = True
    triggered_at: str | None = None


class PriceAlertSyncBody(BaseModel):
    alerts: list[PriceAlertBody] = Field(default_factory=list)


class PriceAlertResponse(BaseModel):
    id: int
    symbol: str
    market: str
    name: str
    target_price: float
    direction: str
    enabled: bool
    triggered_at: str | None = None

    model_config = {"from_attributes": True}


class FcmTokenBody(BaseModel):
    token: str

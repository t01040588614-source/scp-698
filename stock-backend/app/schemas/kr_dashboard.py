from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class KrListStocksQuery(BaseModel):
    query: str | None = None
    market: str | None = None
    sector: str | None = None
    industry: str | None = None
    market_cap_gte: float | None = Field(None, alias="marketCapGte")
    market_cap_lte: float | None = Field(None, alias="marketCapLte")
    per_gte: float | None = Field(None, alias="perGte")
    per_lte: float | None = Field(None, alias="perLte")
    pbr_gte: float | None = Field(None, alias="pbrGte")
    pbr_lte: float | None = Field(None, alias="pbrLte")
    dividend_yield_gte: float | None = Field(None, alias="dividendYieldGte")
    sort_by: Literal["marketCap", "per", "pbr", "dividendYield", "name", "price"] = Field(
        "marketCap", alias="sortBy"
    )
    sort_order: Literal["ASC", "DESC"] = Field("DESC", alias="sortOrder")
    limit: int = Field(50, ge=1, le=500)
    offset: int = Field(0, ge=0)

    model_config = ConfigDict(populate_by_name=True)


class KrStockListItem(BaseModel):
    code: str
    name: str
    name_en: str | None = None
    market: str | None = None
    sector: str | None = None
    industry: str | None = None
    market_cap: float | None = None
    price: float | None = None
    change: float | None = None
    change_percent: float | None = None
    volume: int | None = None
    per: float | None = None
    pbr: float | None = None
    dividend_yield: float | None = None


class KrStockListResponse(BaseModel):
    stocks: list[KrStockListItem]
    total: int


class KrFundamentalOut(BaseModel):
    fiscal_year: int | None = None
    fiscal_quarter: int | None = None
    per: float | None = None
    pbr: float | None = None
    roe: float | None = None
    op_margin: float | None = None
    net_margin: float | None = None
    debt_ratio: float | None = None
    dividend_yield: float | None = None
    industry: str | None = None


class KrStockDetailResponse(BaseModel):
    stock: KrStockListItem
    latest_quote: dict[str, Any] | None = None
    fundamental: KrFundamentalOut | None = None


class KrQuoteBar(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class KrNewsItem(BaseModel):
    id: int
    title: str
    summary: str | None = None
    url: str | None = None
    source: str | None = None
    published_at: datetime | None = None
    sentiment: str | None = None


class KrConsensusOut(BaseModel):
    date: date
    target_price_avg: float | None = None
    target_price_high: float | None = None
    target_price_low: float | None = None
    buy_count: int | None = None
    hold_count: int | None = None
    sell_count: int | None = None


class ScreenerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    conditions: dict[str, Any]
    created_by: str | None = None


class ScreenerOut(BaseModel):
    id: int
    name: str
    conditions: dict[str, Any]
    created_by: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

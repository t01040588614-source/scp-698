from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StockBase(BaseModel):
    symbol: str
    name: str
    price: float
    change: float = 0
    change_percent: float = 0
    volume: int = 0
    market_cap: float = 0
    high: float = 0
    low: float = 0
    open: float = 0
    previous_close: float = 0
    pe_ratio: float = 0
    eps: float = 0
    sector: str = ""


class KoreaStockResponse(StockBase):
    market: str = "KOSPI"


class USStockResponse(StockBase):
    exchange: str = "NASDAQ"
    currency: str = "USD"


class IntlStockResponse(StockBase):
    exchange: str = ""
    currency: str = "USD"


class PortfolioCreate(BaseModel):
    symbol: str
    name: str
    stock_type: str = Field(..., pattern="^(korea|us)$")
    quantity: int = Field(..., gt=0)
    average_price: float = Field(..., gt=0)


class PortfolioUpdate(BaseModel):
    quantity: int | None = None
    average_price: float | None = None


class ChartPoint(BaseModel):
    time: str
    timestamp: str | None = None
    open: float
    high: float
    low: float
    close: float
    volume: int = 0
    value: float


class ChartPeriodSummary(BaseModel):
    open: float
    high: float
    low: float
    close: float
    change: float
    change_percent: float
    total_volume: int
    avg_volume: int
    points_count: int


class StockHistoryResponse(BaseModel):
    symbol: str
    market: str
    period: str
    yahoo_ticker: str
    source: str
    interval: str
    points: list[ChartPoint]
    summary: ChartPeriodSummary


class PeriodReturnsResponse(BaseModel):
    symbol: str
    market: str
    returns: dict[str, float]
    source: str = "mixed"


class ChartEventItem(BaseModel):
    type: str
    date: str
    label: str
    title: str = ""
    amount: float | None = None
    future: bool = False


class ChartEventsResponse(BaseModel):
    symbol: str
    market: str
    period: str
    events: list[ChartEventItem]
    legend: list[dict[str, str]]


class PortfolioResponse(BaseModel):
    id: int
    symbol: str
    name: str
    stock_type: str
    quantity: int
    average_price: float
    current_price: float
    total_value: float
    profit_loss: float
    profit_loss_percent: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

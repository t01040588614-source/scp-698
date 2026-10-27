from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

_ALIAS_CFG = ConfigDict(populate_by_name=True, ser_json_by_alias=True)  # pyright: ignore[reportCallIssue]
_ATTR_ALIAS_CFG = ConfigDict(from_attributes=True, populate_by_name=True, ser_json_by_alias=True)  # pyright: ignore[reportCallIssue]


class AccountUpdate(BaseModel):
    name: str | None = None
    broker: str | None = None
    account_number: str | None = Field(None, alias="accountNumber")
    currency: str | None = None
    initial_cash_balance: float | None = Field(None, alias="initialCashBalance")

    model_config = _ALIAS_CFG


class AccountCreate(BaseModel):
    name: str
    broker: str | None = None
    account_number: str | None = Field(None, alias="accountNumber")
    currency: str | None = "KRW"
    cash_balance: float | None = Field(0, alias="cashBalance")
    owner_id: str | None = Field(None, alias="ownerId")

    model_config = _ALIAS_CFG


class AccountOut(BaseModel):
    id: int
    owner_id: str = Field(alias="ownerId")
    name: str
    broker: str | None = None
    account_number: str | None = Field(None, alias="accountNumber")
    currency: str | None = None
    cash_balance: float | None = Field(None, alias="cashBalance")
    initial_cash_balance: float | None = Field(None, alias="initialCashBalance")

    model_config = _ATTR_ALIAS_CFG


class PositionOut(BaseModel):
    id: int
    stock: dict
    quantity: float | None = None
    average_cost: float | None = Field(None, alias="averageCost")
    last_valuation_amount: float | None = Field(None, alias="lastValuationAmount")
    unrealized_pnl: float | None = Field(None, alias="unrealizedPnL")
    unrealized_pnl_rate: float | None = Field(None, alias="unrealizedPnLRate")

    model_config = _ALIAS_CFG


class TradeCreate(BaseModel):
    stock_code: str = Field(alias="stockCode")
    stock_name: str = Field(alias="stockName")
    side: Literal["BUY", "SELL"]
    trade_date: str = Field(alias="tradeDate")
    price: float
    quantity: float
    fee: float | None = None
    tax: float | None = None
    memo: str | None = None

    model_config = _ALIAS_CFG


class TradeUpdate(BaseModel):
    side: Literal["BUY", "SELL"] | None = None
    trade_date: str | None = Field(None, alias="tradeDate")
    price: float | None = None
    quantity: float | None = None
    fee: float | None = None
    tax: float | None = None
    memo: str | None = None

    model_config = _ALIAS_CFG


class TradeOut(BaseModel):
    id: int
    stock: dict
    side: str
    trade_date: datetime = Field(alias="tradeDate")
    price: float | None = None
    quantity: float | None = None
    amount: float | None = None
    fee: float | None = None
    tax: float | None = None
    memo: str | None = None

    model_config = _ATTR_ALIAS_CFG


class SnapshotOut(BaseModel):
    date: str
    total_asset: float | None = Field(None, alias="totalAsset")
    cash_balance: float | None = Field(None, alias="cashBalance")
    valuation_amount: float | None = Field(None, alias="valuationAmount")
    unrealized_pnl: float | None = Field(None, alias="unrealizedPnL")

    model_config = _ALIAS_CFG

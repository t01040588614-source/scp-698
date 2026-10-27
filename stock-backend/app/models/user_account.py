from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base


class UserAccount(Base):
    """DOCX UserAccount — 증권 계좌."""

    __tablename__ = "user_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    broker: Mapped[str | None] = mapped_column(String(100), nullable=True)
    account_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(10), nullable=True, default="KRW")
    cash_balance: Mapped[float | None] = mapped_column(Float, nullable=True, default=0)
    initial_cash_balance: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    positions: Mapped[list["AccountPosition"]] = relationship(
        "AccountPosition", back_populates="account", cascade="all, delete-orphan"
    )
    trades: Mapped[list["AccountTrade"]] = relationship(
        "AccountTrade", back_populates="account", cascade="all, delete-orphan"
    )
    snapshots: Mapped[list["AccountDailySnapshot"]] = relationship(
        "AccountDailySnapshot", back_populates="account", cascade="all, delete-orphan"
    )


class AccountPosition(Base):
    __tablename__ = "account_positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stock_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    stock_name: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[float | None] = mapped_column(Float, nullable=True, default=0)
    average_cost: Mapped[float | None] = mapped_column(Float, nullable=True, default=0)
    last_valuation_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    unrealized_pnl: Mapped[float | None] = mapped_column(Float, nullable=True)
    unrealized_pnl_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    account: Mapped["UserAccount"] = relationship("UserAccount", back_populates="positions")


class AccountTrade(Base):
    __tablename__ = "account_trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stock_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    stock_name: Mapped[str] = mapped_column(String(100), nullable=False)
    side: Mapped[str] = mapped_column(String(4), nullable=False)  # BUY | SELL
    trade_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    fee: Mapped[float | None] = mapped_column(Float, nullable=True)
    tax: Mapped[float | None] = mapped_column(Float, nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    account: Mapped["UserAccount"] = relationship("UserAccount", back_populates="trades")


class AccountDailySnapshot(Base):
    __tablename__ = "account_daily_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    as_of: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    total_asset: Mapped[float | None] = mapped_column(Float, nullable=True)
    cash_balance: Mapped[float | None] = mapped_column(Float, nullable=True)
    valuation_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    unrealized_pnl: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    account: Mapped["UserAccount"] = relationship("UserAccount", back_populates="snapshots")

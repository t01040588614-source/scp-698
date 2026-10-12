from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class UserAccount(Base):
    """DOCX UserAccount — 증권 계좌."""

    __tablename__ = "user_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    broker = Column(String(100), nullable=True)
    account_number = Column(String(50), nullable=True)
    currency = Column(String(10), nullable=True, default="KRW")
    cash_balance = Column(Float, nullable=True, default=0)
    initial_cash_balance = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    positions = relationship("AccountPosition", back_populates="account", cascade="all, delete-orphan")
    trades = relationship("AccountTrade", back_populates="account", cascade="all, delete-orphan")
    snapshots = relationship("AccountDailySnapshot", back_populates="account", cascade="all, delete-orphan")


class AccountPosition(Base):
    __tablename__ = "account_positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("user_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    stock_code = Column(String(10), nullable=False, index=True)
    stock_name = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=True, default=0)
    average_cost = Column(Float, nullable=True, default=0)
    last_valuation_amount = Column(Float, nullable=True)
    unrealized_pnl = Column(Float, nullable=True)
    unrealized_pnl_rate = Column(Float, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    account = relationship("UserAccount", back_populates="positions")


class AccountTrade(Base):
    __tablename__ = "account_trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("user_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    stock_code = Column(String(10), nullable=False, index=True)
    stock_name = Column(String(100), nullable=False)
    side = Column(String(4), nullable=False)  # BUY | SELL
    trade_date = Column(DateTime(timezone=True), nullable=False)
    price = Column(Float, nullable=True)
    quantity = Column(Float, nullable=True)
    amount = Column(Float, nullable=True)
    fee = Column(Float, nullable=True)
    tax = Column(Float, nullable=True)
    memo = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account = relationship("UserAccount", back_populates="trades")


class AccountDailySnapshot(Base):
    __tablename__ = "account_daily_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("user_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    as_of = Column(Date, nullable=False, index=True)
    total_asset = Column(Float, nullable=True)
    cash_balance = Column(Float, nullable=True)
    valuation_amount = Column(Float, nullable=True)
    unrealized_pnl = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account = relationship("UserAccount", back_populates="snapshots")

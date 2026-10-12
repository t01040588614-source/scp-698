"""DOCX Stock + StockQuote 엔티티 (종목 마스터·일봉)."""

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from app.db.session import Base


class KrStockMaster(Base):
    __tablename__ = "kr_stocks"

    code = Column(String(10), primary_key=True)
    name = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=True)
    market = Column(String(50), nullable=True)
    sector = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    market_cap = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class KrStockDailyQuote(Base):
    __tablename__ = "kr_stock_quotes"
    __table_args__ = (UniqueConstraint("code", "quote_date", name="uq_kr_quote_code_date"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(10), ForeignKey("kr_stocks.code", ondelete="CASCADE"), nullable=False, index=True)
    quote_date = Column(Date, nullable=False)
    open = Column(Float, nullable=True)
    high = Column(Float, nullable=True)
    low = Column(Float, nullable=True)
    close = Column(Float, nullable=True)
    volume = Column(Float, nullable=True)
    amount = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

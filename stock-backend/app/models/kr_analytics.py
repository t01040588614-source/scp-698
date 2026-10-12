from sqlalchemy import JSON, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.db.session import Base


class KrFundamentalSnapshot(Base):
    """종목별 최신 재무 스냅샷 (스크리너 필터용)."""

    __tablename__ = "kr_fundamental_snapshots"

    code = Column(String(10), primary_key=True)
    fiscal_year = Column(Integer, nullable=True)
    fiscal_quarter = Column(Integer, nullable=True)
    per = Column(Float, nullable=True)
    pbr = Column(Float, nullable=True)
    roe = Column(Float, nullable=True)
    op_margin = Column(Float, nullable=True)
    net_margin = Column(Float, nullable=True)
    debt_ratio = Column(Float, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    industry = Column(String(100), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class KrStockNews(Base):
    __tablename__ = "kr_stock_news"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(10), nullable=True, index=True)
    title = Column(String(300), nullable=False)
    summary = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    source = Column(String(100), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    sentiment = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KrConsensus(Base):
    __tablename__ = "kr_consensus"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(10), nullable=False, index=True)
    as_of = Column(Date, nullable=False)
    target_price_avg = Column(Float, nullable=True)
    target_price_high = Column(Float, nullable=True)
    target_price_low = Column(Float, nullable=True)
    buy_count = Column(Integer, nullable=True)
    hold_count = Column(Integer, nullable=True)
    sell_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserScreener(Base):
    __tablename__ = "user_screeners"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    conditions = Column(JSON, nullable=False, default=dict)
    created_by = Column(String(100), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

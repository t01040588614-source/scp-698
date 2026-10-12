from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.sql import func

from app.db.session import Base


class KoreaStockModel(Base):
    """한국주식 모델 (캐시용)"""
    __tablename__ = "korea_stocks"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    change = Column(Float, default=0)
    change_percent = Column(Float, default=0)
    volume = Column(Integer, default=0)
    market_cap = Column(Float, default=0)
    high = Column(Float, default=0)
    low = Column(Float, default=0)
    open = Column(Float, default=0)
    previous_close = Column(Float, default=0)
    market = Column(String, default="KOSPI")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class USStockModel(Base):
    """미국주식 모델 (캐시용)"""
    __tablename__ = "us_stocks"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    change = Column(Float, default=0)
    change_percent = Column(Float, default=0)
    volume = Column(Integer, default=0)
    market_cap = Column(Float, default=0)
    high = Column(Float, default=0)
    low = Column(Float, default=0)
    open = Column(Float, default=0)
    previous_close = Column(Float, default=0)
    exchange = Column(String, default="NASDAQ")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

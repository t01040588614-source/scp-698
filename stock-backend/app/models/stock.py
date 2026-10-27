from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.session import Base


class KoreaStockModel(Base):
    """한국주식 모델 (캐시용)"""

    __tablename__ = "korea_stocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    change: Mapped[float] = mapped_column(Float, default=0)
    change_percent: Mapped[float] = mapped_column(Float, default=0)
    volume: Mapped[int] = mapped_column(Integer, default=0)
    market_cap: Mapped[float] = mapped_column(Float, default=0)
    high: Mapped[float] = mapped_column(Float, default=0)
    low: Mapped[float] = mapped_column(Float, default=0)
    open: Mapped[float] = mapped_column(Float, default=0)
    previous_close: Mapped[float] = mapped_column(Float, default=0)
    market: Mapped[str] = mapped_column(String, default="KOSPI")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class USStockModel(Base):
    """미국주식 모델 (캐시용)"""

    __tablename__ = "us_stocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    change: Mapped[float] = mapped_column(Float, default=0)
    change_percent: Mapped[float] = mapped_column(Float, default=0)
    volume: Mapped[int] = mapped_column(Integer, default=0)
    market_cap: Mapped[float] = mapped_column(Float, default=0)
    high: Mapped[float] = mapped_column(Float, default=0)
    low: Mapped[float] = mapped_column(Float, default=0)
    open: Mapped[float] = mapped_column(Float, default=0)
    previous_close: Mapped[float] = mapped_column(Float, default=0)
    exchange: Mapped[str] = mapped_column(String, default="NASDAQ")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    stock_type = Column(String, nullable=False)  # 'korea' or 'us'
    quantity = Column(Integer, nullable=False, default=0)
    average_price = Column(Float, nullable=False, default=0)
    current_price = Column(Float, default=0)
    total_value = Column(Float, default=0)
    profit_loss = Column(Float, default=0)
    profit_loss_percent = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="portfolios")

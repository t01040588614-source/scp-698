from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.db.session import Base


class UserBrokerCredential(Base):
    """회원별 증권 Open API 자격 (KIS 등) — 서버 저장."""

    __tablename__ = "user_broker_credentials"
    __table_args__ = (UniqueConstraint("user_id", "integration_id", name="uq_user_broker_integration"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    integration_id = Column(String(32), nullable=False, default="kis_korea")
    app_key = Column(String(256), nullable=False)
    app_secret = Column(String(256), nullable=False)
    account_no = Column(String(32), nullable=True)
    account_product_code = Column(String(8), nullable=True, default="01")
    use_mock = Column(String(8), nullable=True, default="")
    extra_json = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

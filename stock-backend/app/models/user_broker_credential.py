from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.session import Base


class UserBrokerCredential(Base):
    """회원별 증권 Open API 자격 (KIS 등) — 서버 저장."""

    __tablename__ = "user_broker_credentials"
    __table_args__ = (
        UniqueConstraint("user_id", "integration_id", name="uq_user_broker_integration"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    integration_id: Mapped[str] = mapped_column(String(32), nullable=False, default="kis_korea")
    app_key: Mapped[str] = mapped_column(String(256), nullable=False)
    app_secret: Mapped[str] = mapped_column(String(256), nullable=False)
    account_no: Mapped[str | None] = mapped_column(String(32), nullable=True)
    account_product_code: Mapped[str | None] = mapped_column(String(8), nullable=True, default="01")
    use_mock: Mapped[str | None] = mapped_column(String(8), nullable=True, default="")
    extra_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

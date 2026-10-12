from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_broker_credential import UserBrokerCredential
from app.schemas.broker import UserKisCredentialBody


class BrokerCredentialService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_kis(self, user_id: int) -> UserBrokerCredential | None:
        result = await self.db.execute(
            select(UserBrokerCredential).where(
                UserBrokerCredential.user_id == user_id,
                UserBrokerCredential.integration_id == "kis_korea",
            )
        )
        return result.scalar_one_or_none()

    async def upsert_kis(self, user_id: int, body: UserKisCredentialBody) -> UserBrokerCredential:
        row = await self.get_kis(user_id)
        mock_flag = "1" if body.use_mock else ""
        account_no = body.account_no.strip().replace("-", "")[:20]
        if row is None:
            row = UserBrokerCredential(
                user_id=user_id,
                integration_id="kis_korea",
                app_key=body.app_key.strip(),
                app_secret=body.app_secret.strip(),
                account_no=account_no or None,
                account_product_code=(body.account_product_code or "01").strip()[:8],
                use_mock=mock_flag,
                verified_at=datetime.now(timezone.utc),
            )
            self.db.add(row)
        else:
            row.app_key = body.app_key.strip()
            row.app_secret = body.app_secret.strip()
            row.account_no = account_no or None
            row.account_product_code = (body.account_product_code or "01").strip()[:8]
            row.use_mock = mock_flag
            row.verified_at = datetime.now(timezone.utc)
        await self.db.flush()
        return row

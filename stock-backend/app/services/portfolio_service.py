from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.portfolio import Portfolio
from app.schemas.stock import PortfolioCreate, PortfolioUpdate


class PortfolioService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user(self, user_id: int) -> list[Portfolio]:
        result = await self.db.execute(
            select(Portfolio).where(Portfolio.user_id == user_id, Portfolio.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def get_by_id(self, portfolio_id: int, user_id: int) -> Portfolio | None:
        result = await self.db.execute(
            select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: int, portfolio_in: PortfolioCreate) -> Portfolio:
        portfolio = Portfolio(
            user_id=user_id,
            symbol=portfolio_in.symbol,
            name=portfolio_in.name,
            stock_type=portfolio_in.stock_type,
            quantity=portfolio_in.quantity,
            average_price=portfolio_in.average_price,
            total_value=portfolio_in.quantity * portfolio_in.average_price,
        )
        self.db.add(portfolio)
        await self.db.flush()
        await self.db.refresh(portfolio)
        return portfolio

    async def update(self, portfolio: Portfolio, portfolio_in: PortfolioUpdate) -> Portfolio:
        update_data = portfolio_in.model_dump(exclude_unset=True)

        if "quantity" in update_data or "average_price" in update_data:
            if update_data.get("quantity") is not None:
                portfolio.quantity = update_data["quantity"]
            if update_data.get("average_price") is not None:
                portfolio.average_price = update_data["average_price"]
            portfolio.total_value = portfolio.quantity * portfolio.average_price

        for field, value in update_data.items():
            if field not in ["quantity", "average_price"]:
                setattr(portfolio, field, value)

        await self.db.flush()
        await self.db.refresh(portfolio)
        return portfolio

    async def delete(self, portfolio: Portfolio) -> None:
        portfolio.is_active = False
        await self.db.flush()

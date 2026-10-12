
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.stock import PortfolioCreate, PortfolioResponse, PortfolioUpdate
from app.services.portfolio_service import PortfolioService

router = APIRouter()


@router.get("/", response_model=list[PortfolioResponse])
async def get_portfolio(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """내 포트폴리오 조회"""
    service = PortfolioService(db)
    portfolios = await service.get_by_user(current_user.id)
    return portfolios


@router.post("/", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def add_to_portfolio(
    portfolio_in: PortfolioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """포트폴리오에 종목 추가"""
    service = PortfolioService(db)
    return await service.create(current_user.id, portfolio_in)


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    portfolio_in: PortfolioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """포트폴리오 수정"""
    service = PortfolioService(db)
    portfolio = await service.get_by_id(portfolio_id, current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="포트폴리오를 찾을 수 없습니다")
    return await service.update(portfolio, portfolio_in)


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_from_portfolio(
    portfolio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """포트폴리오에서 제거"""
    service = PortfolioService(db)
    portfolio = await service.get_by_id(portfolio_id, current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="포트폴리오를 찾을 수 없습니다")
    await service.delete(portfolio)

"""DOCX 명세 — 계좌·매매·스냅샷 (/api/v1/accounts)."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_optional_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.accounts import AccountCreate, AccountOut, AccountUpdate, TradeCreate, TradeUpdate
from app.services.accounts_service import AccountsService, _resolve_owner_id

router = APIRouter(tags=["계좌 (DOCX)"])


def get_service(db: AsyncSession = Depends(get_db)) -> AccountsService:
    return AccountsService(db)


@router.get("", response_model=list[AccountOut])
async def list_accounts(
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    accounts = await service.list_accounts(oid)
    return [
        AccountOut(
            id=a.id,
            ownerId=a.owner_id,
            name=a.name,
            broker=a.broker,
            accountNumber=a.account_number,
            currency=a.currency,
            cashBalance=a.cash_balance,
            initialCashBalance=a.initial_cash_balance,
        )
        for a in accounts
    ]


@router.post("", response_model=AccountOut, status_code=201)
async def create_account(
    body: AccountCreate,
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(body.owner_id or owner_id, current_user.id if current_user else None)
    account = await service.create_account(body, oid, current_user.id if current_user else None)
    return AccountOut(
        id=account.id,
        ownerId=account.owner_id,
        name=account.name,
        broker=account.broker,
        accountNumber=account.account_number,
        currency=account.currency,
        cashBalance=account.cash_balance,
        initialCashBalance=account.initial_cash_balance,
    )


@router.patch("/{account_id}", response_model=AccountOut)
async def update_account(
    account_id: int,
    body: AccountUpdate,
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    account = await service.update_account(account_id, oid, body)
    return AccountOut(
        id=account.id,
        ownerId=account.owner_id,
        name=account.name,
        broker=account.broker,
        accountNumber=account.account_number,
        currency=account.currency,
        cashBalance=account.cash_balance,
        initialCashBalance=account.initial_cash_balance,
    )


@router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    return await service.delete_account(account_id, oid)


@router.get("/{account_id}", response_model=AccountOut)
async def get_account(
    account_id: int,
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    account = await service.get_account(account_id, oid)
    return AccountOut(
        id=account.id,
        ownerId=account.owner_id,
        name=account.name,
        broker=account.broker,
        accountNumber=account.account_number,
        currency=account.currency,
        cashBalance=account.cash_balance,
        initialCashBalance=account.initial_cash_balance,
    )


@router.get("/{account_id}/positions")
async def list_positions(
    account_id: int,
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    return await service.list_positions(account_id, oid)


@router.get("/{account_id}/trades")
async def list_trades(
    account_id: int,
    limit: int = Query(50, ge=1, le=200),
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    return await service.list_trades(account_id, oid, limit)


@router.post("/{account_id}/trades", status_code=201)
async def create_trade(
    account_id: int,
    body: TradeCreate,
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    return await service.create_trade(account_id, oid, body)


@router.get("/{account_id}/trades/{trade_id}")
async def get_trade(
    account_id: int,
    trade_id: int,
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    await service.get_account(account_id, oid)
    return await service.get_trade(trade_id, oid)


@router.patch("/{account_id}/trades/{trade_id}")
async def update_trade(
    account_id: int,
    trade_id: int,
    body: TradeUpdate,
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    await service.get_account(account_id, oid)
    return await service.update_trade(trade_id, oid, body)


@router.delete("/{account_id}/trades/{trade_id}")
async def delete_trade(
    account_id: int,
    trade_id: int,
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    await service.get_account(account_id, oid)
    return await service.delete_trade(trade_id, oid)


@router.get("/{account_id}/snapshots")
async def list_snapshots(
    account_id: int,
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    owner_id: str | None = Query(None, alias="ownerId"),
    service: AccountsService = Depends(get_service),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    oid = _resolve_owner_id(owner_id, current_user.id if current_user else None)
    return await service.list_snapshots(account_id, oid, from_date, to_date)

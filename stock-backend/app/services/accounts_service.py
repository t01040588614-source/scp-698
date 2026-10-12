from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_account import (
    AccountDailySnapshot,
    AccountPosition,
    AccountTrade,
    UserAccount,
)
from app.schemas.accounts import AccountCreate, AccountUpdate, TradeCreate, TradeUpdate
from app.services.market_data import market_data


def _resolve_owner_id(owner_query: str | None, user_id: int | None) -> str:
    if user_id is not None:
        return str(user_id)
    return owner_query or "local-user"


def _live_price(code: str) -> float:
    row = market_data.get_by_symbol(code)
    if row and row.get("price"):
        return float(row["price"])
    return 0.0


def _trade_to_out(trade: AccountTrade) -> dict[str, Any]:
    return {
        "id": trade.id,
        "stock": {"code": trade.stock_code, "name": trade.stock_name},
        "side": trade.side,
        "tradeDate": trade.trade_date,
        "price": trade.price,
        "quantity": trade.quantity,
        "amount": trade.amount,
        "fee": trade.fee,
        "tax": trade.tax,
        "memo": trade.memo,
    }


class AccountsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_account_for_owner(self, account_id: int, owner_id: str) -> UserAccount:
        result = await self.db.execute(
            select(UserAccount).where(UserAccount.id == account_id, UserAccount.owner_id == owner_id)
        )
        account = result.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=404, detail="계좌를 찾을 수 없습니다")
        return account

    async def list_accounts(self, owner_id: str) -> list[UserAccount]:
        result = await self.db.execute(
            select(UserAccount).where(UserAccount.owner_id == owner_id).order_by(UserAccount.id.desc())
        )
        return list(result.scalars().all())

    async def create_account(self, dto: AccountCreate, owner_id: str, user_id: int | None) -> UserAccount:
        account = UserAccount(
            owner_id=owner_id,
            user_id=user_id,
            name=dto.name,
            broker=dto.broker,
            account_number=dto.account_number,
            currency=dto.currency or "KRW",
            cash_balance=float(dto.cash_balance or 0),
            initial_cash_balance=float(dto.cash_balance or 0),
        )
        self.db.add(account)
        await self.db.flush()
        await self._upsert_snapshot(account)
        return account

    async def update_account(
        self, account_id: int, owner_id: str, dto: AccountUpdate
    ) -> UserAccount:
        account = await self._get_account_for_owner(account_id, owner_id)
        if dto.name is not None:
            account.name = dto.name
        if dto.broker is not None:
            account.broker = dto.broker
        if dto.account_number is not None:
            account.account_number = dto.account_number
        if dto.currency is not None:
            account.currency = dto.currency
        if dto.initial_cash_balance is not None:
            account.initial_cash_balance = float(dto.initial_cash_balance)
        await self.recalculate_all(account)
        await self._upsert_snapshot(account)
        return account

    async def delete_account(self, account_id: int, owner_id: str) -> dict[str, bool]:
        account = await self._get_account_for_owner(account_id, owner_id)
        await self.db.delete(account)
        await self.db.flush()
        return {"ok": True}

    async def get_account(self, account_id: int, owner_id: str) -> UserAccount:
        return await self._get_account_for_owner(account_id, owner_id)

    async def list_positions(self, account_id: int, owner_id: str) -> list[dict[str, Any]]:
        await self._get_account_for_owner(account_id, owner_id)
        result = await self.db.execute(
            select(AccountPosition).where(AccountPosition.account_id == account_id)
        )
        positions = result.scalars().all()
        out: list[dict[str, Any]] = []
        for p in positions:
            qty = float(p.quantity or 0)
            avg = float(p.average_cost or 0)
            last = _live_price(p.stock_code)
            val = last * qty if qty > 0 else 0
            cost = avg * qty
            pnl = val - cost if qty > 0 else 0
            rate = (pnl / cost * 100) if cost > 0 else 0
            p.last_valuation_amount = val
            p.unrealized_pnl = pnl
            p.unrealized_pnl_rate = rate
            out.append(
                {
                    "id": p.id,
                    "stock": {"code": p.stock_code, "name": p.stock_name},
                    "quantity": qty,
                    "averageCost": avg,
                    "lastValuationAmount": val,
                    "unrealizedPnL": pnl,
                    "unrealizedPnLRate": rate,
                }
            )
        await self.db.flush()
        return out

    async def list_trades(self, account_id: int, owner_id: str, limit: int = 50) -> list[dict[str, Any]]:
        await self._get_account_for_owner(account_id, owner_id)
        result = await self.db.execute(
            select(AccountTrade)
            .where(AccountTrade.account_id == account_id)
            .order_by(AccountTrade.trade_date.desc(), AccountTrade.id.desc())
            .limit(limit)
        )
        return [_trade_to_out(t) for t in result.scalars().all()]

    async def get_trade(self, trade_id: int, owner_id: str) -> dict[str, Any]:
        result = await self.db.execute(
            select(AccountTrade)
            .join(UserAccount)
            .where(AccountTrade.id == trade_id, UserAccount.owner_id == owner_id)
        )
        trade = result.scalar_one_or_none()
        if not trade:
            raise HTTPException(status_code=404, detail="매매 내역을 찾을 수 없습니다")
        return _trade_to_out(trade)

    async def create_trade(self, account_id: int, owner_id: str, dto: TradeCreate) -> dict[str, Any]:
        account = await self._get_account_for_owner(account_id, owner_id)
        trade_date = datetime.fromisoformat(dto.trade_date.replace("Z", "+00:00"))
        if trade_date.tzinfo is None:
            trade_date = trade_date.replace(tzinfo=timezone.utc)
        amount = dto.price * dto.quantity
        trade = AccountTrade(
            account_id=account.id,
            stock_code=dto.stock_code,
            stock_name=dto.stock_name,
            side=dto.side,
            trade_date=trade_date,
            price=dto.price,
            quantity=dto.quantity,
            amount=amount,
            fee=dto.fee,
            tax=dto.tax,
            memo=dto.memo,
        )
        self.db.add(trade)
        await self.db.flush()
        await self.recalculate_all(account)
        if float(account.cash_balance or 0) < -0.01:
            await self.db.delete(trade)
            await self.recalculate_all(account)
            raise HTTPException(status_code=400, detail="현금 잔고가 부족합니다")
        await self._upsert_snapshot(account)
        return _trade_to_out(trade)

    async def update_trade(self, trade_id: int, owner_id: str, dto: TradeUpdate) -> dict[str, Any]:
        result = await self.db.execute(
            select(AccountTrade, UserAccount)
            .join(UserAccount)
            .where(AccountTrade.id == trade_id, UserAccount.owner_id == owner_id)
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="매매 내역을 찾을 수 없습니다")
        trade, account = row[0], row[1]
        backup = (
            trade.side,
            trade.trade_date,
            trade.price,
            trade.quantity,
            trade.fee,
            trade.tax,
            trade.memo,
            trade.amount,
        )
        if dto.side is not None:
            trade.side = dto.side
        if dto.trade_date is not None:
            td = datetime.fromisoformat(dto.trade_date.replace("Z", "+00:00"))
            if td.tzinfo is None:
                td = td.replace(tzinfo=timezone.utc)
            trade.trade_date = td
        if dto.price is not None:
            trade.price = dto.price
        if dto.quantity is not None:
            trade.quantity = dto.quantity
        if dto.fee is not None:
            trade.fee = dto.fee
        if dto.tax is not None:
            trade.tax = dto.tax
        if dto.memo is not None:
            trade.memo = dto.memo
        trade.amount = (trade.price or 0) * (trade.quantity or 0)
        await self.db.flush()
        await self.recalculate_all(account)
        if float(account.cash_balance or 0) < -0.01:
            (
                trade.side,
                trade.trade_date,
                trade.price,
                trade.quantity,
                trade.fee,
                trade.tax,
                trade.memo,
                trade.amount,
            ) = backup
            await self.recalculate_all(account)
            raise HTTPException(status_code=400, detail="현금 잔고가 부족합니다")
        await self._upsert_snapshot(account)
        return _trade_to_out(trade)

    async def delete_trade(self, trade_id: int, owner_id: str) -> dict[str, bool]:
        result = await self.db.execute(
            select(AccountTrade, UserAccount)
            .join(UserAccount)
            .where(AccountTrade.id == trade_id, UserAccount.owner_id == owner_id)
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="매매 내역을 찾을 수 없습니다")
        trade, account = row[0], row[1]
        code, name = trade.stock_code, trade.stock_name
        await self.db.delete(trade)
        await self.db.flush()
        await self.recalculate_all(account)
        await self._upsert_snapshot(account)
        return {"ok": True}

    async def recalculate_cash(self, account: UserAccount, trades: list[AccountTrade] | None = None) -> None:
        if account.initial_cash_balance is None:
            account.initial_cash_balance = float(account.cash_balance or 0)
        cash = float(account.initial_cash_balance or 0)
        if trades is None:
            result = await self.db.execute(
                select(AccountTrade)
                .where(AccountTrade.account_id == account.id)
                .order_by(AccountTrade.trade_date.asc(), AccountTrade.id.asc())
            )
            trades = list(result.scalars().all())
        for t in trades:
            amt = float(t.amount or (t.price or 0) * (t.quantity or 0))
            fee = float(t.fee or 0)
            tax = float(t.tax or 0)
            if t.side == "BUY":
                cash -= amt + fee + tax
            else:
                cash += amt - fee - tax
        account.cash_balance = cash

    async def recalculate_all(self, account: UserAccount) -> None:
        result = await self.db.execute(
            select(AccountTrade)
            .where(AccountTrade.account_id == account.id)
            .order_by(AccountTrade.trade_date.asc(), AccountTrade.id.asc())
        )
        all_trades = list(result.scalars().all())
        codes: dict[str, str] = {}
        for t in all_trades:
            codes[t.stock_code] = t.stock_name
        pos_result = await self.db.execute(
            select(AccountPosition).where(AccountPosition.account_id == account.id)
        )
        for p in pos_result.scalars().all():
            if p.stock_code not in codes:
                await self.db.delete(p)
        for code, name in codes.items():
            await self.recalculate_position(account, code, name)
        await self.recalculate_cash(account, all_trades)
        await self.db.flush()

    async def snapshot_all_accounts(self) -> int:
        result = await self.db.execute(select(UserAccount))
        accounts = list(result.scalars().all())
        for account in accounts:
            await self.recalculate_all(account)
            await self._upsert_snapshot(account)
        return len(accounts)

    async def recalculate_position(self, account: UserAccount, code: str, name: str) -> None:
        result = await self.db.execute(
            select(AccountTrade)
            .where(AccountTrade.account_id == account.id, AccountTrade.stock_code == code)
            .order_by(AccountTrade.trade_date.asc(), AccountTrade.id.asc())
        )
        trades = list(result.scalars().all())
        qty = 0.0
        avg = 0.0
        for t in trades:
            pq = float(t.quantity or 0)
            pp = float(t.price or 0)
            if t.side == "BUY":
                new_qty = qty + pq
                if new_qty > 0:
                    avg = ((avg * qty) + (pp * pq)) / new_qty if qty > 0 else pp
                qty = new_qty
            else:
                qty = max(0.0, qty - pq)
                if qty == 0:
                    avg = 0.0

        pos_result = await self.db.execute(
            select(AccountPosition).where(
                AccountPosition.account_id == account.id, AccountPosition.stock_code == code
            )
        )
        pos = pos_result.scalar_one_or_none()
        if qty <= 0:
            if pos:
                await self.db.delete(pos)
            return
        if not pos:
            pos = AccountPosition(
                account_id=account.id,
                stock_code=code,
                stock_name=name,
            )
            self.db.add(pos)
        pos.stock_name = name
        pos.quantity = qty
        pos.average_cost = avg
        last = _live_price(code)
        val = last * qty
        cost = avg * qty
        pos.last_valuation_amount = val
        pos.unrealized_pnl = val - cost
        pos.unrealized_pnl_rate = ((val - cost) / cost * 100) if cost > 0 else 0

    async def list_snapshots(
        self, account_id: int, owner_id: str, from_date: date | None, to_date: date | None
    ) -> list[dict[str, Any]]:
        account = await self._get_account_for_owner(account_id, owner_id)
        await self._upsert_snapshot(account)
        q = select(AccountDailySnapshot).where(AccountDailySnapshot.account_id == account_id)
        if from_date:
            q = q.where(AccountDailySnapshot.as_of >= from_date)
        if to_date:
            q = q.where(AccountDailySnapshot.as_of <= to_date)
        q = q.order_by(AccountDailySnapshot.as_of.asc())
        result = await self.db.execute(q)
        rows = result.scalars().all()
        return [
            {
                "date": r.as_of.isoformat(),
                "totalAsset": r.total_asset,
                "cashBalance": r.cash_balance,
                "valuationAmount": r.valuation_amount,
                "unrealizedPnL": r.unrealized_pnl,
            }
            for r in rows
        ]

    async def _upsert_snapshot(self, account: UserAccount) -> None:
        positions = await self.list_positions(account.id, account.owner_id)
        valuation = sum(float(p.get("lastValuationAmount") or 0) for p in positions)
        pnl = sum(float(p.get("unrealizedPnL") or 0) for p in positions)
        cash = float(account.cash_balance or 0)
        total = cash + valuation
        today = date.today()
        result = await self.db.execute(
            select(AccountDailySnapshot).where(
                AccountDailySnapshot.account_id == account.id,
                AccountDailySnapshot.as_of == today,
            )
        )
        snap = result.scalar_one_or_none()
        if not snap:
            snap = AccountDailySnapshot(account_id=account.id, as_of=today)
            self.db.add(snap)
        snap.cash_balance = cash
        snap.valuation_amount = valuation
        snap.unrealized_pnl = pnl
        snap.total_asset = total

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import engine

router = APIRouter(redirect_slashes=False)


@router.get("")
@router.get("/")
async def health_check():
    return {"status": "healthy", "message": "Stock API 서버 정상"}


@router.get("/db")
async def db_health_check():
    """데이터베이스 연결 상태 확인"""
    try:
        async with engine.connect() as conn:
            await conn.execute(select(1))
    except SQLAlchemyError as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
    else:
        return {"status": "healthy", "database": "connected"}

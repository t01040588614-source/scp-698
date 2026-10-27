import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.market_data import market_data
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/stocks")
async def stock_websocket(websocket: WebSocket):
    """실시간 주식·지수 WebSocket

    - 구독: {"action": "subscribe", "symbols": ["005930"], "indexIds": ["kospi", "kosdaq"]}
    - 해제: {"action": "unsubscribe"}
    """
    await ws_manager.connect(websocket)
    try:
        try:
            await websocket.send_json(
                {
                    "type": "all_stocks",
                    "data": market_data.get_all(),
                }
            )
            initial_indices = market_data.get_indices()
            if initial_indices:
                await websocket.send_json(
                    {
                        "type": "indices",
                        "data": initial_indices,
                    }
                )
        except Exception as exc:
            logger.warning("WS initial payload failed: %s", exc)

        while True:
            raw_message = await websocket.receive_text()
            try:
                message = json.loads(raw_message)
                action = message.get("action")
                symbols = message.get("symbols")
                index_ids = message.get("indexIds") or message.get("index_ids")

                if action == "subscribe":
                    sym_list = symbols if isinstance(symbols, list) else []
                    idx_list = index_ids if isinstance(index_ids, list) else []
                    cached = market_data.get_all_symbols()
                    merged_syms = sorted(set(sym_list) | set(cached))
                    ws_manager.update_subscriptions(
                        websocket,
                        symbols=merged_syms,
                        index_ids=idx_list,
                    )
                    if merged_syms:
                        asyncio.create_task(market_data.refresh_symbols(merged_syms))
                    await websocket.send_json(
                        {
                            "type": "subscribed",
                            "symbols": merged_syms,
                            "indexIds": idx_list,
                        }
                    )
                elif action == "unsubscribe":
                    ws_manager.update_subscriptions(websocket, symbols=[], index_ids=[])
                    await websocket.send_json({"type": "unsubscribed"})
                else:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "지원하지 않는 action입니다",
                        }
                    )
            except json.JSONDecodeError:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "JSON 형식이 올바르지 않습니다",
                    }
                )
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

"use client";

import { useEffect, useState } from "react";
import SystemStatusLink from "@/components/navigation/SystemStatusLink";
import { useMarketWebSocketContext } from "@/context/MarketWebSocketProvider";

/** WS 끊김 시 상단 안내 (자동 재연결) */
export default function WsOfflineBanner() {
  const ctx = useMarketWebSocketContext();
  const connected = ctx?.isConnected ?? false;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (connected) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(t);
  }, [connected]);

  if (!visible || connected) return null;

  return (
    <div className="ws-offline-banner" role="status">
      <div className="container ws-offline-banner-inner">
        <span>
          WebSocket 연결이 끊겼습니다. 시세는 REST 폴링으로 표시됩니다. 백엔드(포트 8000) 실행
          후 자동 재연결됩니다.
        </span>
        <SystemStatusLink>연결 상태</SystemStatusLink>
      </div>
    </div>
  );
}

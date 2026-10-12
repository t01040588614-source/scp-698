import {
  getKoreaMarketSession,
  getUSMarketSession,
  sessionLabel,
  type MarketSession as SessionKind,
} from "@/lib/marketHours";

export type MarketRegion = "korea" | "us";

export type SessionState = "open" | "closed" | "pre";

export type MarketSession = {
  label: string;
  state: SessionState;
  detail: string;
};

function toBoardState(session: SessionKind): SessionState {
  if (session === "after") return "closed";
  return session;
}

function detailFor(region: MarketRegion, session: SessionKind): string {
  if (region === "korea") {
    if (session === "open") return "Closes 15:30 KST";
    if (session === "pre") return "Opens 09:00 KST";
    if (session === "after") return "After-hours";
    return "Next open 09:00 KST";
  }
  if (session === "open") return "Closes 16:00 ET";
  if (session === "pre") return "Opens 09:30 ET";
  if (session === "after") return "After-hours";
  return "Next open 09:30 ET";
}

/** 보드 메타용 (ET·KST 캘린더, API hook과 동일 규칙) */
export function getMarketSession(region: MarketRegion, now = new Date()): MarketSession {
  const session = region === "korea" ? getKoreaMarketSession(now) : getUSMarketSession(now);
  return {
    label: session === "open" ? "Regular hours" : sessionLabel(session),
    state: toBoardState(session),
    detail: detailFor(region, session),
  };
}

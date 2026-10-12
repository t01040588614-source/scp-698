import holidaysData from "@/data/exchangeHolidays.json";

export type MarketSession = "open" | "closed" | "pre" | "after";
export type MarketRegionCode = "kr" | "us";

const KR_HOLIDAYS = new Set(holidaysData.kr);
const US_HOLIDAYS = new Set(holidaysData.us);
const EARLY_CLOSE = holidaysData.earlyCloseTimes as Record<string, string>;

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getZonedParts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return {
    day: WEEKDAY_MAP[weekdayStr] ?? 1,
    dateKey: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
  };
}

function regularCloseMinutes(region: MarketRegionCode, dateKey: string): number {
  const key = `${region}:${dateKey}`;
  const custom = EARLY_CLOSE[key];
  if (custom) {
    const [h, m] = custom.split(":").map(Number);
    return h * 60 + m;
  }
  return region === "kr" ? 15 * 60 + 30 : 16 * 60;
}

function isHoliday(region: MarketRegionCode, dateKey: string): boolean {
  return region === "kr" ? KR_HOLIDAYS.has(dateKey) : US_HOLIDAYS.has(dateKey);
}

export function getKoreaMarketSession(now = new Date()): MarketSession {
  const { day, dateKey, minutes } = getZonedParts(now, "Asia/Seoul");
  if (isHoliday("kr", dateKey) || day === 0 || day === 6) return "closed";
  const openEnd = regularCloseMinutes("kr", dateKey);
  if (minutes >= 9 * 60 && minutes < openEnd) return "open";
  if (minutes >= 8 * 60 && minutes < 9 * 60) return "pre";
  if (minutes >= openEnd && minutes < 16 * 60) return "after";
  return "closed";
}

export function getUSMarketSession(now = new Date()): MarketSession {
  const { day, dateKey, minutes } = getZonedParts(now, "America/New_York");
  if (isHoliday("us", dateKey) || day === 0 || day === 6) return "closed";
  const openEnd = regularCloseMinutes("us", dateKey);
  if (minutes >= 9 * 60 + 30 && minutes < openEnd) return "open";
  if (minutes >= 4 * 60 && minutes < 9 * 60 + 30) return "pre";
  if (minutes >= openEnd && minutes < 20 * 60) return "after";
  return "closed";
}

export function sessionLabel(session: MarketSession): string {
  switch (session) {
    case "open":
      return "Open";
    case "pre":
      return "Pre-market";
    case "after":
      return "After-hours";
    default:
      return "Closed";
  }
}

const SCHEDULE: Record<MarketRegionCode, string> = {
  kr: "Regular 09:00–15:30 KST · Pre 08:00–09:00 · After 15:30–16:00 · closed weekends & holidays",
  us: "Regular 09:30–16:00 ET · Pre 04:00–09:30 · After 16:00–20:00 · closed weekends & holidays",
};

function sessionStatusLine(region: MarketRegionCode, session: MarketSession): string {
  const market = region === "kr" ? "Korea" : "US";
  switch (session) {
    case "open":
      return `${market} regular session is open.`;
    case "pre":
      return region === "kr"
        ? "Korea pre-market (before the open)."
        : "US pre-market session.";
    case "after":
      return region === "kr"
        ? "Korea regular session closed; after-hours."
        : "US regular session closed; after-hours.";
    default:
      return `${market} market is closed.`;
  }
}

/** 네이티브 title·접근성용 장 안내 (API 없을 때 fallback) */
export function sessionTooltip(region: MarketRegionCode, session: MarketSession): string {
  return `${sessionStatusLine(region, session)} ${SCHEDULE[region]}`;
}

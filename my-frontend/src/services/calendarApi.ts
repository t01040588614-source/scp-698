import { mockCalendarEvents, type CalendarEvent } from "@/data/mockData";
import { getApiBaseUrl } from "@/lib/apiBase";

export type CalendarFetchResult = {
  data: CalendarEvent[];
  status: string;
  sources?: string[];
  count?: number;
  krCount?: number;
  usCount?: number;
  from?: string;
  to?: string;
  fetchedAt?: string;
  refreshSec?: number;
};

function normalizeEvent(raw: Record<string, unknown>): CalendarEvent {
  return {
    id: String(raw.id),
    date: String(raw.date),
    time: String(raw.time),
    country: String(raw.country),
    event: String(raw.event),
    impact: (raw.impact as CalendarEvent["impact"]) || "medium",
    forecast: String(raw.forecast ?? "—"),
    previous: String(raw.previous ?? "—"),
    actual: raw.actual == null || raw.actual === "—" ? null : String(raw.actual),
  };
}

function toCamelJson(json: Record<string, unknown>): CalendarFetchResult {
  const data = Array.isArray(json.data)
    ? json.data.map((row) => normalizeEvent(row as Record<string, unknown>))
    : [];
  return {
    data,
    status: String(json.status ?? "live"),
    sources: Array.isArray(json.sources) ? (json.sources as string[]) : undefined,
    count: typeof json.count === "number" ? json.count : data.length,
    krCount: typeof json.kr_count === "number" ? json.kr_count : typeof json.krCount === "number" ? json.krCount : undefined,
    usCount: typeof json.us_count === "number" ? json.us_count : typeof json.usCount === "number" ? json.usCount : undefined,
    from: json.from ? String(json.from) : undefined,
    to: json.to ? String(json.to) : undefined,
    fetchedAt: json.fetched_at ? String(json.fetched_at) : json.fetchedAt ? String(json.fetchedAt) : undefined,
    refreshSec: typeof json.refresh_sec === "number" ? json.refresh_sec : typeof json.refreshSec === "number" ? json.refreshSec : undefined,
  };
}

export async function getCalendarEvents(params: { from?: string; to?: string; refresh?: boolean } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.refresh) qs.set("refresh", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  try {
    const res = await fetch(`${getApiBaseUrl()}/calendar${suffix}`, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as Record<string, unknown>;
      return toCamelJson(json);
    }
  } catch {
    // fallback below
  }

  return {
    data: mockCalendarEvents,
    status: "mock",
    count: mockCalendarEvents.length,
  } satisfies CalendarFetchResult;
}

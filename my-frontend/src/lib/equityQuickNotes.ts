const STORAGE_KEY = "ml-equity-quick-notes";

function noteKey(market: "korea" | "us", symbol: string) {
  return `${market}:${symbol}`;
}

function readAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(notes: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  window.dispatchEvent(new Event("equity-quick-notes-changed"));
}

export function readEquityQuickNote(market: "korea" | "us", symbol: string): string {
  return readAll()[noteKey(market, symbol)] ?? "";
}

export function saveEquityQuickNote(market: "korea" | "us", symbol: string, text: string) {
  const all = readAll();
  const key = noteKey(market, symbol);
  const trimmed = text.trim();
  if (!trimmed) {
    delete all[key];
  } else {
    all[key] = trimmed.slice(0, 2000);
  }
  writeAll(all);
}

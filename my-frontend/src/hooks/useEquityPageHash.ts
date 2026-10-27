"use client";

import { useCallback, useEffect, useState } from "react";

export type EquityPrimaryTabId = "general" | "chart" | "news" | "financials" | "technical";

export type EquitySubTabId =
  | "overview"
  | "profile"
  | "ownership"
  | "historical"
  | "splits"
  | "index";

export type EquityPageTabState = {
  primary: EquityPrimaryTabId;
  sub: EquitySubTabId;
};

const SUB_TAB_IDS: EquitySubTabId[] = [
  "overview",
  "profile",
  "ownership",
  "historical",
  "splits",
  "index",
];

export function hashForPrimary(id: EquityPrimaryTabId): string {
  switch (id) {
    case "general":
      return "#overview";
    case "chart":
      return "#chart";
    case "news":
      return "#news";
    case "financials":
      return "#financials";
    case "technical":
      return "#technical";
  }
}

export function hashForSub(id: EquitySubTabId): string {
  return `#${id}`;
}

export function parseEquityPageHash(hash: string): EquityPageTabState {
  const raw = hash.replace(/^#/, "").trim() || "overview";

  if (SUB_TAB_IDS.includes(raw as EquitySubTabId)) {
    return { primary: "general", sub: raw as EquitySubTabId };
  }

  switch (raw) {
    case "chart":
      return { primary: "chart", sub: "overview" };
    case "news":
      return { primary: "news", sub: "overview" };
    case "financials":
      return { primary: "financials", sub: "overview" };
    case "technical":
      return { primary: "technical", sub: "overview" };
    default:
      return { primary: "general", sub: "overview" };
  }
}

export function useEquityPageHash() {
  const [tabs, setTabs] = useState<EquityPageTabState>(() =>
    parseEquityPageHash(typeof window !== "undefined" ? window.location.hash : "")
  );

  useEffect(() => {
    const sync = () => setTabs(parseEquityPageHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const navigate = useCallback((hash: string) => {
    const normalized = hash.startsWith("#") ? hash : `#${hash}`;
    if (window.location.hash !== normalized) {
      window.location.hash = normalized;
    } else {
      setTabs(parseEquityPageHash(normalized));
    }
  }, []);

  return { tabs, navigate };
}

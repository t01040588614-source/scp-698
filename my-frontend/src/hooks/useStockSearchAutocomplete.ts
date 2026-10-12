"use client";

import { useEffect, useState } from "react";
import { searchAll, type SearchResultItem } from "@/services/searchApi";

export function useStockSearchAutocomplete(query: string, debounceMs = 280) {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchAll(q)
        .then((items) => {
          if (!cancelled) setResults(items);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, debounceMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, debounceMs]);

  return { results, loading };
}

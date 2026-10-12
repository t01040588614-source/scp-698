"use client";

import { useMemo } from "react";

/** 배열 참조가 바뀌어도 내용이 같으면 동일한 심볼 목록 유지 */
export function useStableSymbolList(symbols: string[]) {
  const key = useMemo(
    () => Array.from(new Set(symbols.filter(Boolean))).sort().join("|"),
    [symbols]
  );
  return useMemo(() => (key ? key.split("|") : []), [key]);
}

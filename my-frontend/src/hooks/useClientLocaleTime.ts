"use client";

import { useEffect, useState } from "react";

const FORMATS = {
  hm: { hour: "2-digit", minute: "2-digit" } as Intl.DateTimeFormatOptions,
  hms: {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  } as Intl.DateTimeFormatOptions,
};

export type ClientLocaleTimeFormat = keyof typeof FORMATS;

/** SSR·하이드레이션 안전: 마운트 전 null, 이후 locale 시각 문자열 */
export function useClientLocaleTime(
  format: ClientLocaleTimeFormat = "hms",
  locale = "ko-KR",
  tickMs = 1000
): string | null {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const options = FORMATS[format];
    const tick = () => setText(new Date().toLocaleTimeString(locale, options));
    tick();
    if (tickMs <= 0) return;
    const id = window.setInterval(tick, tickMs);
    return () => window.clearInterval(id);
  }, [format, locale, tickMs]);

  return text;
}

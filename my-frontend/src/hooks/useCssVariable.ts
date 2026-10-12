"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

/** Recharts/SVG attribute용 — CSS 변수는 SVG stroke/fill에 적용되지 않는 경우가 많음 */
export function useCssVariable(name: string, fallback = ""): string {
  const { resolved } = useTheme();
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const root = document.documentElement;
    const raw = getComputedStyle(root).getPropertyValue(name).trim();
    setValue(raw || fallback);
  }, [name, fallback, resolved]);

  return value;
}

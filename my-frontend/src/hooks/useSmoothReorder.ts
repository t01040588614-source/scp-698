"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";

/** 실시간 순위·정렬 변경 시 FLIP 애니메이션 (tbody, ul 등 자식 reorder) */
export function useSmoothReorder(durationMs = 420) {
  return useAutoAnimate({
    duration: durationMs,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  });
}

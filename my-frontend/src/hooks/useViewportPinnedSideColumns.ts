"use client";

import { useLayoutEffect, type RefObject } from "react";
import { dispatchLayoutSync } from "@/lib/layoutSync";

const DESKTOP_MQ = "(min-width: 1024px)";

function readPxVar(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

type Metrics = {
  asideLeft: number;
  asideWidth: number;
};

function slotLooksValid(left: number, width: number, vw: number): boolean {
  if (!Number.isFinite(left) || !Number.isFinite(width)) return false;
  if (width < 200 || width > vw * 0.42) return false;
  if (left < 0 || left + width > vw + 2) return false;
  // 오른쪽 컬럼(그리드 3열) — 가운데 이후에 있어야 레일·본문을 덮지 않음
  return left + width * 0.5 > vw * 0.42;
}

/**
 * Grid 슬롯 너비는 유지하고, **오른쪽 사이드바만** 뷰포트에 고정.
 * 왼쪽 도구 레일은 CSS `position: sticky`만 사용 (fixed 시 좌표 오류로 클릭 막힘 방지).
 */
export function useViewportPinnedSideColumns(
  gridRef: RefObject<HTMLElement | null>,
  railRef: RefObject<HTMLElement | null>,
  asideRef: RefObject<HTMLElement | null>,
  asideSlotRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const grid = gridRef.current;
    const aside = asideRef.current;
    const rail = railRef.current;
    if (!grid || !aside) return;

    const mq = window.matchMedia(DESKTOP_MQ);
    let metrics: Metrics = { asideLeft: 0, asideWidth: 0 };
    let lastSyncKey = "";

    const clearPin = (el: HTMLElement | null) => {
      if (!el) return;
      el.classList.remove("is-viewport-pinned", "is-grid-bottom-pinned");
      el.style.top = "";
      el.style.left = "";
      el.style.width = "";
      el.style.maxHeight = "";
    };

    const measureAsideSlot = (): Metrics => {
      clearPin(aside);
      clearPin(rail);

      const slot = asideSlotRef.current ?? aside.parentElement;
      const rect = (slot ?? aside).getBoundingClientRect();
      return { asideLeft: rect.left, asideWidth: rect.width };
    };

    const pinViewport = (stickyTop: number, maxHeight: number, m: Metrics) => {
      aside.classList.remove("is-grid-bottom-pinned");
      aside.classList.add("is-viewport-pinned");
      aside.style.top = `${stickyTop}px`;
      aside.style.left = `${m.asideLeft}px`;
      aside.style.width = `${m.asideWidth}px`;
      aside.style.maxHeight = `${maxHeight}px`;
    };

    const pinGridBottom = () => {
      aside.classList.remove("is-viewport-pinned");
      aside.classList.add("is-grid-bottom-pinned");
      aside.style.top = "";
      aside.style.left = "";
      aside.style.width = "";
      aside.style.maxHeight = "";
    };

    const update = () => {
      clearPin(rail);

      if (!mq.matches) {
        clearPin(aside);
        return;
      }

      const stickyTop = readPxVar("--layout-sticky-top", 12);
      const gutter = readPxVar("--layout-sticky-gutter", 12);
      const maxHeight = Math.max(120, window.innerHeight - stickyTop - gutter);
      const vw = window.innerWidth;

      const gridRect = grid.getBoundingClientRect();
      const gridTop = gridRect.top;
      const gridBottom = gridRect.bottom;

      if (gridTop > stickyTop) {
        clearPin(aside);
        metrics = measureAsideSlot();
        return;
      }

      metrics = measureAsideSlot();

      if (!slotLooksValid(metrics.asideLeft, metrics.asideWidth, vw)) {
        clearPin(aside);
        return;
      }

      const h = aside.offsetHeight;
      if (gridBottom <= stickyTop + h) {
        pinGridBottom();
      } else {
        pinViewport(stickyTop, maxHeight, metrics);
      }

      const syncKey = [
        aside.classList.contains("is-viewport-pinned") ? "v" : aside.classList.contains("is-grid-bottom-pinned") ? "b" : "n",
        aside.style.left,
        aside.style.width,
      ].join("|");
      if (syncKey !== lastSyncKey) {
        lastSyncKey = syncKey;
        requestAnimationFrame(() => dispatchLayoutSync());
      }
    };

    metrics = measureAsideSlot();
    update();

    const onScroll = () => update();
    const onResize = () => update();

    mq.addEventListener("change", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(grid);
    if (asideSlotRef.current) ro?.observe(asideSlotRef.current);
    else ro?.observe(aside);

    return () => {
      mq.removeEventListener("change", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      clearPin(aside);
      clearPin(rail);
    };
  }, [enabled, gridRef, railRef, asideRef, asideSlotRef]);
}

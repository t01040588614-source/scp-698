"use client";

import { useLayoutEffect, type RefObject } from "react";
import { dispatchLayoutSync } from "@/lib/layoutSync";

const DESKTOP_MQ = "(min-width: 1024px)";

function readPxVar(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

type PinTarget = {
  el: HTMLElement;
  slotLeft: number;
  slotWidth: number;
};

/**
 * Grid 슬롯 너비는 유지하고, 레일·사이드바만 뷰포트에 고정 (overflow-x:hidden 환경에서 sticky 대체).
 */
export function useViewportPinnedSideColumns(
  gridRef: RefObject<HTMLElement | null>,
  railRef: RefObject<HTMLElement | null>,
  asideRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const grid = gridRef.current;
    const aside = asideRef.current;
    const rail = railRef.current;
    if (!grid || !aside) return;

    const mq = window.matchMedia(DESKTOP_MQ);
    const metrics = {
      asideLeft: 0,
      asideWidth: 0,
      railLeft: 0,
      railWidth: 0,
    };
    let lastSyncKey = "";

    const clearPin = (el: HTMLElement | null) => {
      if (!el) return;
      el.classList.remove("is-viewport-pinned", "is-grid-bottom-pinned");
      el.style.top = "";
      el.style.left = "";
      el.style.width = "";
      el.style.maxHeight = "";
    };

    const measureSlots = () => {
      clearPin(aside);
      clearPin(rail);
      const a = aside.getBoundingClientRect();
      metrics.asideLeft = a.left;
      metrics.asideWidth = a.width;
      if (rail) {
        const r = rail.getBoundingClientRect();
        metrics.railLeft = r.left;
        metrics.railWidth = r.width;
      }
    };

    const pinViewport = (target: PinTarget, stickyTop: number, maxHeight: number) => {
      const { el, slotLeft, slotWidth } = target;
      el.classList.remove("is-grid-bottom-pinned");
      el.classList.add("is-viewport-pinned");
      el.style.top = `${stickyTop}px`;
      el.style.left = `${slotLeft}px`;
      el.style.width = `${slotWidth}px`;
      el.style.maxHeight = `${maxHeight}px`;
    };

    const pinGridBottom = (el: HTMLElement) => {
      el.classList.remove("is-viewport-pinned");
      el.classList.add("is-grid-bottom-pinned");
      el.style.top = "";
      el.style.left = "";
      el.style.width = "";
      el.style.maxHeight = "";
    };

    const update = () => {
      if (!mq.matches) {
        clearPin(aside);
        clearPin(rail);
        return;
      }

      const stickyTop = readPxVar("--layout-sticky-top", 12);
      const gutter = readPxVar("--layout-sticky-gutter", 12);
      const maxHeight = Math.max(120, window.innerHeight - stickyTop - gutter);

      const gridRect = grid.getBoundingClientRect();
      const gridTop = gridRect.top;
      const gridBottom = gridRect.bottom;

      if (gridTop > stickyTop) {
        measureSlots();
        return;
      }

      if (metrics.asideWidth < 1) {
        measureSlots();
      }

      const applyColumn = (el: HTMLElement, slotLeft: number, slotWidth: number) => {
        const h = el.offsetHeight;
        if (gridBottom <= stickyTop + h) {
          pinGridBottom(el);
          return;
        }
        pinViewport({ el, slotLeft, slotWidth }, stickyTop, maxHeight);
      };

      applyColumn(aside, metrics.asideLeft, metrics.asideWidth);
      if (rail) applyColumn(rail, metrics.railLeft, metrics.railWidth);

      const syncKey = [
        aside.classList.contains("is-viewport-pinned") ? "v" : aside.classList.contains("is-grid-bottom-pinned") ? "b" : "n",
        aside.style.width,
        aside.style.left,
        rail?.classList.contains("is-viewport-pinned") ? "rv" : "rn",
      ].join("|");
      if (syncKey !== lastSyncKey) {
        lastSyncKey = syncKey;
        requestAnimationFrame(() => dispatchLayoutSync());
      }
    };

    measureSlots();
    update();

    const onScroll = () => update();
    const onResize = () => {
      measureSlots();
      update();
    };

    mq.addEventListener("change", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(grid);
    if (aside) ro?.observe(aside);

    return () => {
      mq.removeEventListener("change", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      clearPin(aside);
      clearPin(rail);
    };
  }, [enabled, gridRef, railRef, asideRef]);
}

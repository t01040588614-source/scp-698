/** lightweight-charts — 단일 dynamic import (ChunkLoadError·중복 청크 방지) */

type LwcModule = typeof import("@/lib/lightweightChartsClient");

let modulePromise: Promise<LwcModule> | null = null;

function isChunkLoadError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  const message = String((err as { message?: string }).message ?? "");
  return name === "ChunkLoadError" || message.includes("Loading chunk") || message.includes("ChunkLoadError");
}

async function importOnce(): Promise<LwcModule> {
  return import(
    /* webpackChunkName: "lwc" */
    "@/lib/lightweightChartsClient"
  );
}

/**
 * Client-only. 실패 시 1회 자동 새로고침(.next 청크 꼬임), 그래도 실패하면 reject.
 */
export function loadLightweightCharts(): Promise<LwcModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("lightweight-charts must load on the client"));
  }

  if (!modulePromise) {
    const pending = (async (): Promise<LwcModule> => {
      try {
        return await importOnce();
      } catch (first) {
        modulePromise = null;
        if (isChunkLoadError(first)) {
          const flag = "marketlens-lwc-chunk-reload";
          if (!sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, "1");
            window.location.reload();
            return new Promise<LwcModule>(() => {
              /* reload pending */
            });
          }
          sessionStorage.removeItem(flag);
        }
        throw first;
      }
    })();
    modulePromise = pending;
  }

  return modulePromise;
}

/** 성공 로드 후 자동 새로고침 플래그 제거 */
export function clearLightweightChartsReloadFlag(): void {
  try {
    sessionStorage.removeItem("marketlens-lwc-chunk-reload");
  } catch {
    /* ignore */
  }
}

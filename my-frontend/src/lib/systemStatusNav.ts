export const SYSTEM_STATUS_PATH = "/tools";
export const SYSTEM_STATUS_ID = "system-status";
export const SYSTEM_STATUS_HREF = `${SYSTEM_STATUS_PATH}#${SYSTEM_STATUS_ID}`;

export function scrollToSystemStatusPanel(behavior: ScrollBehavior = "smooth") {
  if (typeof document === "undefined") return;
  document.getElementById(SYSTEM_STATUS_ID)?.scrollIntoView({ behavior, block: "start" });
}

/** 로그인·다른 페이지에서도 시스템 상태 섹션으로 확실히 이동 */
export function goToSystemStatus(currentPathname: string) {
  if (typeof window === "undefined") return;

  if (currentPathname === SYSTEM_STATUS_PATH) {
    if (window.location.hash !== `#${SYSTEM_STATUS_ID}`) {
      window.history.replaceState(null, "", SYSTEM_STATUS_HREF);
    }
    scrollToSystemStatusPanel();
    return;
  }

  window.location.assign(SYSTEM_STATUS_HREF);
}

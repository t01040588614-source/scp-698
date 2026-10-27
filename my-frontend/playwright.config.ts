import { defineConfig, devices } from "@playwright/test";

/** dev와 동일 호스트 — standalone `next start`는 output:standalone과 맞지 않음 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

/** 로컬: 이미 띄운 dev/start(3000) 재사용. CI·강제 기동은 PLAYWRIGHT_FORCE_WEBSERVER=1 */
const reuseExistingServer =
  !process.env.CI && process.env.PLAYWRIGHT_FORCE_WEBSERVER !== "1";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  /* 로컬 dev(8000·3000) 단일 프로세스 — 병렬 시 시세·sticky E2E flaky */
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // CDN 브라우저 다운로드 없이 로컬 Edge/Chrome 사용 (Windows 기본)
        channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer,
        timeout: 180_000,
      },
});

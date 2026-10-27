import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * 실기기에 가까운 뷰포트 — 캡처는 `npm run test:e2e:mobile-checklist` 로 실행.
 * 수동 QA 항목은 e2e/MOBILE_VIEWPORT_CHECKLIST.md 참고.
 */
const MOBILE_VIEWPORTS = [
  { id: "iphone-se", label: "iPhone SE", width: 375, height: 667 },
  { id: "iphone-14", label: "iPhone 14", width: 390, height: 844 },
  { id: "iphone-14-pro-max", label: "iPhone 14 Pro Max", width: 430, height: 932 },
  { id: "galaxy-s23", label: "Galaxy S23", width: 360, height: 780 },
  { id: "pixel-7", label: "Pixel 7", width: 412, height: 915 },
] as const;

const CHECKLIST_ROUTES = [
  { path: "/markets", slug: "markets", note: "티커+빠른 이동·스크롤 전" },
  { path: "/korea", slug: "korea", note: "하위 탭·세션 pill" },
  { path: "/watchlist", slug: "watchlist", note: "티커+하단 네비" },
] as const;

const OUT_DIR = path.join(__dirname, "mobile-checklist-captures");

test.describe("Mobile viewport screenshot checklist", () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  for (const vp of MOBILE_VIEWPORTS) {
    for (const route of CHECKLIST_ROUTES) {
      test(`${vp.id} · ${route.slug} — top`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route.path);
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await expect(page.locator(".app-market-chrome-sticky")).toBeVisible({ timeout: 20_000 });

        const file = path.join(OUT_DIR, `${vp.id}-${route.slug}-top.png`);
        await page.screenshot({ path: file, fullPage: false });

        const scrolled = path.join(OUT_DIR, `${vp.id}-${route.slug}-scrolled.png`);
        await page.evaluate(() => window.scrollTo(0, 720));
        await page.waitForTimeout(100);
        await expect(page.locator(".app-market-chrome-sticky.is-pinned")).toBeVisible({
          timeout: 8_000,
        });
        await page.screenshot({ path: scrolled, fullPage: false });
      });
    }
  }
});

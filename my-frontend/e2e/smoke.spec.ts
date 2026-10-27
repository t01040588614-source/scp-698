import { test, expect } from "@playwright/test";

test.describe("MarketLens smoke", () => {
  test("home/markets loads", async ({ page }) => {
    let status = 500;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await page.goto("/markets", { waitUntil: "domcontentloaded" });
      status = res?.status() ?? 500;
      if (status < 500) break;
      await page.waitForTimeout(1200);
    }
    expect(status).toBeLessThan(500);
    await expect(page.locator("main.app-main, .app-main")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("region", { name: "지역별 시장 개요" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("API health via proxy", async ({ request }) => {
    const res = await request.get("/api/v1/health/");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });

  test("watchlist page", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page.getByRole("heading", { name: /관심/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("tools API list", async ({ request }) => {
    const res = await request.get("/api/v1/tools");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThan(2);
  });

  test("quote chart — 1달 loads without runtime error", async ({ page }) => {
    await page.goto("/quote/korea/005930");
    await expect(page.locator(".inv-equity-instrument-price")).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "1달", exact: true }).click();
    await expect(page.locator(".inv-investing-chart-empty[role='alert']")).toHaveCount(0);
    await expect(page.locator(".inv-chart-ordinal-month-axis")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".inv-chart-ordinal-month-axis__tick").first()).toHaveText("1일");
    await expect(page.locator(".inv-chart-ordinal-month-axis__tick").nth(30)).toHaveText("31일");
  });
});

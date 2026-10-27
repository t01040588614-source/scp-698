import { test, expect } from "@playwright/test";

test.describe("Market chrome — 스크롤", () => {
  test("모바일 /markets — 스크롤 시 빠른 이동이 화면 밖으로", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/markets");
    await page.waitForLoadState("domcontentloaded");

    const quickNav = page.getByRole("navigation", { name: "빠른 이동" });
    await expect(quickNav).toBeVisible({ timeout: 15_000 });

    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(100);
    await expect(quickNav.getByRole("link", { name: "한국 주식" })).not.toBeInViewport();

    const sticky = page.locator(".app-market-chrome-sticky");
    const stickyBox = await sticky.boundingBox();
    expect(stickyBox).not.toBeNull();
    expect(stickyBox!.y).toBeLessThan(0);
  });

  test("데스크톱 /markets — 스크롤 시 티커·빠른 이동이 화면 밖으로", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/markets");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".app-market-chrome-sticky--with-ticker")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel("주요 시장 티커")).toBeVisible({ timeout: 20_000 });

    const quickNav = page.getByRole("navigation", { name: "빠른 이동" });
    await expect(quickNav).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(100);
    await expect(quickNav.getByRole("link", { name: "시장 개요" })).not.toBeInViewport();
  });
});

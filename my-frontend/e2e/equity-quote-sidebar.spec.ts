import { test, expect } from "@playwright/test";

/** 종목 상세 — 모바일에서 사이드바(Insights·관심종목)가 display:none 되지 않는지 */
test.describe("Equity quote sidebar visibility", () => {
  test("mobile — aside visible and scrollable below chart", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/quote/korea/034730");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".inv-equity-instrument-price")).toBeVisible({ timeout: 45_000 });

    const asideSlot = page.locator(".inv-equity-page .inv-side-slot--aside");
    await expect(asideSlot).toBeVisible({ timeout: 15_000 });

    const display = await asideSlot.evaluate((el) => getComputedStyle(el).display);
    expect(display).not.toBe("none");

    await expect(page.getByRole("heading", { name: "관심종목 (로컬)" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: "빠른 실행" })).toBeVisible({
      timeout: 15_000,
    });

    const box = await page.getByRole("heading", { name: "관심종목 (로컬)" }).boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThan(0);
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator(".inv-sidebar-indices--live").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("desktop — toss 2-column layout and sticky aside scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/quote/korea/028050");
    await expect(page.locator(".inv-equity-instrument-price")).toBeVisible({ timeout: 45_000 });

    await expect(page.locator(".inv-equity-page--toss")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".inv-equity-instrument-back")).toBeVisible();

    const grid = page.locator(".inv-layout-3col--equity-quote");
    const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    expect(cols.split(/\s+/).length).toBeGreaterThanOrEqual(2);

    const aside = page.locator(".inv-split-aside--equity-quote");
    await expect(aside).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "빠른 실행" })).toBeVisible({
      timeout: 15_000,
    });
    const watchlistBox = await page
      .getByRole("heading", { name: /관심종목/ })
      .boundingBox();
    const quickBox = await page.getByRole("heading", { name: "빠른 실행" }).boundingBox();
    expect(watchlistBox).not.toBeNull();
    expect(quickBox).not.toBeNull();
    if (watchlistBox && quickBox) {
      expect(quickBox.y).toBeGreaterThan(watchlistBox.y);
      expect(quickBox.y - watchlistBox.y).toBeLessThan(520);
    }

    const metrics = await aside.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        overflowY: s.overflowY,
        maxHeight: s.maxHeight,
        position: s.position,
      };
    });

    expect(metrics.position).toBe("sticky");
    expect(metrics.overflowY).toBe("auto");

    const floatLayout = await page
      .locator(".inv-layout-3col--equity-float-aside")
      .evaluate((el) => getComputedStyle(el).display);
    expect(floatLayout).toBe("block");

    const slotBg = await page
      .locator(".inv-equity-page--toss .inv-side-slot--aside")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(slotBg).not.toBe("rgba(0, 0, 0, 0)");

    await expect(page.locator(".inv-equity-quote-sidebar-bottom")).toBeVisible({ timeout: 15_000 });
    const tail = page.locator(".inv-equity-quote-sidebar-tail");
    await expect(tail).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "오늘 상승 TOP" })).toBeVisible({
      timeout: 15_000,
    });
    const tailBox = await tail.boundingBox();
    expect(tailBox).not.toBeNull();
    if (tailBox) {
      expect(tailBox.height).toBeGreaterThan(80);
    }

    const asideBox = await aside.boundingBox();
    const moreBox = await page.getByText("시장·인사이트·랭킹 더보기").boundingBox();
    expect(asideBox).not.toBeNull();
    expect(moreBox).not.toBeNull();
    if (asideBox && moreBox) {
      const slack = asideBox.y + asideBox.height - (moreBox.y + moreBox.height);
      expect(slack).toBeLessThan(80);
    }

    await expect(page.getByRole("heading", { name: "주요 통계" }).nth(1)).toBeVisible({
      timeout: 20_000,
    });
    const fold = page.getByText(/시장·인사이트·랭킹 (접기|더보기)/);
    if (await fold.isVisible()) {
      const label = await fold.textContent();
      if (label?.includes("더보기")) await fold.click();
    }
    const row = page.locator(".inv-sidebar-index-row--btn:not(.is-pending)").first();
    await expect(row).toBeVisible({ timeout: 20_000 });
  });
});

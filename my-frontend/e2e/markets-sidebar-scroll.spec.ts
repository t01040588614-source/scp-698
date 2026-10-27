import { test, expect } from "@playwright/test";

/** /markets 우측 — 페이지 스크롤로 TOP·뉴스·캘린더까지 도달 */
test.describe("Markets hub sidebar page scroll", () => {
  test("desktop — rankings and calendar reachable via window scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/markets");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "지역별 시장 개요" })).toBeVisible({
      timeout: 45_000,
    });

    const aside = page.locator(".inv-split-aside").first();
    await expect(aside).toBeVisible({ timeout: 20_000 });

    const before = await aside.evaluate((el) => {
      const s = getComputedStyle(el);
      return { overflowY: s.overflowY, maxHeight: s.maxHeight, scrollH: el.scrollHeight, clientH: el.clientHeight };
    });
    expect(before.overflowY).toBe("visible");
    expect(before.maxHeight).toBe("none");
    expect(before.scrollH).toBe(before.clientH);

    await expect(page.locator(".inv-split-aside").getByRole("heading", { name: "상승률 TOP" })).toBeAttached();
    await expect(page.locator(".inv-split-aside").getByRole("heading", { name: "경제 캘린더" })).toBeAttached();

    const reached = await page.evaluate(() => {
      const el = document.querySelector(".inv-split-aside h3.inv-widget-title");
      if (!el) return false;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.top < window.innerHeight && r.height > 0;
    });
    expect(reached).toBe(true);
  });
});

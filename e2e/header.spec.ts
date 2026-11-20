import { expect, test } from "@playwright/test";

const WIDTHS = [320, 375] as const;

for (const [path, name, switchName] of [
  ["/", "Infotera", /^EN English$/],
  ["/en", "Infotera", /^PT Português$/],
] as const) {
  for (const width of WIDTHS) {
    test(`header em ${width}px (${path}): logo numa linha e seletor 'EN'/'PT' com nome acessível completo`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(path);
      const logo = page.locator("header").first().locator("a").first();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveText(name, { useInnerText: true });
      const lines = await logo.evaluate((node) => {
        const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight);
        return Math.round(node.getBoundingClientRect().height / lineHeight);
      });
      expect(lines).toBe(1);
      await expect(logo).toHaveAccessibleName(/^Infotera Hotéis,/);
      const switcher = page.locator("header a[hreflang]");
      await expect(switcher).toHaveAccessibleName(switchName);
      await expect(switcher).not.toHaveAttribute("aria-label");
      const headerHeight = await page
        .locator("header")
        .first()
        .evaluate((n) => n.getBoundingClientRect().height);
      expect(headerHeight).toBeLessThanOrEqual(57);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  }
}

test("a partir de 400px o logo é completo e o seletor mostra o nome por extenso", async ({
  page,
}) => {
  await page.setViewportSize({ width: 420, height: 700 });
  await page.goto("/");
  await expect(page.locator("header").first().locator("a").first()).toHaveText("Infotera Hotéis", {
    useInnerText: true,
  });
  await expect(page.locator("header a[hreflang]")).toHaveAccessibleName("English");
});

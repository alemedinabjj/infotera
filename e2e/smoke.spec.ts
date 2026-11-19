import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home: estrutura, headers de segurança, acessibilidade e 320px", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response?.headers()["x-powered-by"]).toBeUndefined();

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page).toHaveTitle(/Infotera/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);

  await page.setViewportSize({ width: 320, height: 640 });
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

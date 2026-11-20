import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { analyzeAccessibility } from "./helpers/axe";

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

  const skipLink = page.getByRole("link", { name: "Pular para o conteúdo" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(
    page.getByRole("banner").getByRole("link", { name: /Infotera Hotéis/ }),
  ).toHaveAttribute("href", "/");

  const results = await analyzeAccessibility(page);
  expect(results.violations).toEqual([]);

  await page.setViewportSize({ width: 320, height: 640 });
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

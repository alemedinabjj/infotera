import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("rota inexistente: 404 com h1, link de volta e sem violações axe", async ({ page }) => {
  const response = await page.goto("/rota-que-nao-existe");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Página não encontrada" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar para a busca" })).toHaveAttribute(
    "href",
    "/",
  );

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

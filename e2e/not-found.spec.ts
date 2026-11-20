import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { analyzeAccessibility } from "./helpers/axe";

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

  const results = await analyzeAccessibility(page);
  expect(results.violations).toEqual([]);
});

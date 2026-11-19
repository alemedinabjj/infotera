import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { addDays, todayISO } from "../src/shared/lib/dates";

const checkIn = addDays(todayISO(), 7);
const checkOut = addDays(todayISO(), 10);

const destination = (page: Page) => page.getByRole("combobox", { name: /Destino/ });
const submit = (page: Page) => page.getByRole("button", { name: "Buscar hotéis" });

const typeDestination = async (page: Page, text: string) => {
  await destination(page).focus();
  await destination(page).pressSequentially(text, { delay: 30 });
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(submit(page)).toBeVisible();
});

test("fluxo feliz só com teclado leva para /search com a URL certa e guarda a busca", async ({
  page,
}) => {
  await typeDestination(page, "sao");
  await expect(page.getByRole("option", { name: /São Paulo, SP/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(destination(page)).toHaveValue("São Paulo, SP");

  await page.getByLabel(/Check-in/).fill(checkIn);
  await page.getByLabel(/Check-out/).fill(checkOut);
  // Os inputs de data têm vários segmentos (dia/mês/ano) que consomem Tab: pulamos para o último stepper.
  await page.getByRole("button", { name: "Aumentar quartos" }).focus();
  await page.keyboard.press("Tab");
  await expect(submit(page)).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(
    new RegExp(
      `/search\\?destination=S%C3%A3o\\+Paulo%2C\\+SP&checkIn=${checkIn}&checkOut=${checkOut}&rooms=1&adults=2&children=0`,
    ),
  );

  await page.goto("/");
  const recent = page.getByRole("button", { name: /^São Paulo, SP · .* 2 adultos · 1 quarto$/ });
  await expect(recent).toBeVisible();
  await page.reload();
  await expect(recent).toBeVisible();

  await recent.click();
  await expect(destination(page)).toHaveValue("São Paulo, SP");
  await expect(submit(page)).toBeFocused();
  await page.getByRole("button", { name: "Limpar buscas recentes" }).click();
  await expect(page.getByRole("heading", { name: "Buscas recentes" })).toHaveCount(0);
});

test("enviar vazio mostra o resumo com 3 erros e foca o destino", async ({ page }) => {
  await submit(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "Corrija 3 campos" })).toBeVisible();
  await expect(destination(page)).toBeFocused();
  await expect(destination(page)).toHaveAttribute("aria-invalid", "true");
});

test("rede lenta: spinner e 'Buscando destinos…' enquanto carrega", async ({ page }) => {
  await page.route("**/suggestions**", async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("_delay", "2000");
    await route.continue({ url: url.toString() });
  });
  await typeDestination(page, "flor");
  await expect(page.locator("p", { hasText: "Buscando destinos…" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Florianópolis, SC/ })).toBeVisible({
    timeout: 6000,
  });
});

test("falha da API mostra erro e 'Tentar de novo' recupera", async ({ page }) => {
  await page.route("**/suggestions**", async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("_fail", "1");
    await route.continue({ url: url.toString() });
  });
  await typeDestination(page, "flor");
  const retry = page.getByRole("button", { name: "Tentar de novo" });
  await expect(retry).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Não foi possível carregar os destinos.").first()).toBeVisible();
  await page.unroute("**/suggestions**");
  await retry.click();
  await expect(page.getByRole("option", { name: /Florianópolis, SC/ })).toBeVisible();
});

test("axe: sem violações com o popover aberto e com erros visíveis", async ({ page }) => {
  await typeDestination(page, "sao");
  await expect(page.getByRole("option", { name: /São Paulo, SP/ })).toBeVisible();
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await submit(page).press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Corrija" })).toBeVisible();
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("320 px: sem scroll horizontal, com popover e erros", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await typeDestination(page, "bra");
  await expect(page.getByRole("option").first()).toBeVisible();
  const overflowsOpen = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflowsOpen).toBe(false);
  await page.keyboard.press("Escape");
  await submit(page).press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "Corrija" })).toBeVisible();
  const overflowsErrors = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflowsErrors).toBe(false);
});

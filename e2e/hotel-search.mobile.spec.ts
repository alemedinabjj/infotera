import { expect, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { cards, searchPath } from "./helpers/hotel-search";
import { test } from "./helpers/mock-api-server";

// Só o projeto mobile: os filtros viram bottom-sheet abaixo de `lg`.
test.beforeEach(({ isMobile }) => {
  test.skip(!isMobile, "bottom-sheet de filtros só existe no celular");
});

const trigger = (page: Page) => page.getByRole("button", { name: /^Filtros/ });
const sheet = (page: Page) => page.getByRole("dialog", { name: "Filtros" });

const openSheet = async (page: Page) => {
  await trigger(page).click();
  await expect(sheet(page)).toBeVisible();
};

const expectNoHorizontalScroll = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
};

test.describe("bottom-sheet de filtros (critério 29)", () => {
  test("abre com foco no slider, aplica na hora, mostra o contador e 'Ver N hotéis' fecha devolvendo o foco", async ({
    page,
  }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expect(trigger(page)).toHaveText("Filtros");
    await openSheet(page);
    await expect(sheet(page).getByLabel("Mínimo")).toBeFocused();

    await sheet(page).getByRole("checkbox", { name: "Piscina" }).check();
    await expect(page).toHaveURL(/amenity=pool/);
    const seeResults = sheet(page).getByRole("button", { name: /^Ver \d+ hotéis$/ });
    await expect(seeResults).toBeVisible();
    await expect(cards(page)).toHaveCount(7);
    await seeResults.click();
    await expect(sheet(page)).toHaveCount(0);
    await expect(trigger(page)).toHaveText("Filtros (1)");
    await expect(trigger(page)).toBeFocused();
    await expect(cards(page)).toHaveCount(7);
  });

  test("Esc fecha e devolve o foco ao gatilho; 'Limpar filtros' do rodapé limpa", async ({
    page,
  }) => {
    await page.goto(searchPath("amenity=pool&sort=price-asc"));
    await expect(cards(page)).toHaveCount(7);
    await openSheet(page);
    await sheet(page).getByRole("button", { name: "Limpar filtros" }).click();
    await expect(page).not.toHaveURL(/amenity/);
    await expect(page).toHaveURL(/sort=price-asc/);
    await page.keyboard.press("Escape");
    await expect(sheet(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveText("Filtros");
  });

  test("clicar fora (backdrop) fecha o sheet", async ({ page }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await openSheet(page);
    await page.mouse.click(180, 20);
    await expect(sheet(page)).toHaveCount(0);
  });
});

test.describe("320 px sem scroll horizontal (critério 30)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("lista, paginação e sheet", async ({ page }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expectNoHorizontalScroll(page);
    await expect(page.getByText("Página 1 de 2", { exact: true })).toBeVisible();
    await openSheet(page);
    const overflow = await sheet(page).evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expectNoHorizontalScroll(page);
  });

  test("vazio e erro também cabem", async ({ page, failingApi }) => {
    await page.goto(searchPath("", "Bonito, MS"));
    await expect(page.getByRole("heading", { name: "Nenhum hotel em Bonito, MS" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.route(/\/hotels\?/, (route) => {
      const original = new URL(route.request().url());
      return route.continue({ url: `${failingApi.url}${original.pathname}${original.search}` });
    });
    await page.goto(searchPath());
    await expect(page.getByRole("alert").filter({ hasText: "Não foi possível" })).toBeVisible({
      timeout: 12_000,
    });
    await expectNoHorizontalScroll(page);
  });
});

test.describe("acessibilidade (axe wcag2a/aa, critério 31)", () => {
  test("lista", async ({ page }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("sheet aberto", async ({ page }) => {
    await page.goto(searchPath("amenity=pool"));
    await expect(cards(page)).toHaveCount(7);
    await openSheet(page);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("vazio (destino e filtros)", async ({ page }) => {
    await page.goto(searchPath("", "Bonito, MS"));
    await expect(page.getByRole("heading", { name: "Nenhum hotel em Bonito, MS" })).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
    await page.goto(searchPath("amenity=pool&amenity=spa&amenity=kids_club"));
    await expect(
      page.getByRole("heading", { name: "Nenhum hotel com esses filtros" }),
    ).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("erro", async ({ page, failingApi }) => {
    await page.route(/\/hotels\?/, (route) => {
      const original = new URL(route.request().url());
      return route.continue({ url: `${failingApi.url}${original.pathname}${original.search}` });
    });
    await page.goto(searchPath());
    await expect(page.getByRole("alert").filter({ hasText: "Não foi possível" })).toBeVisible({
      timeout: 12_000,
    });
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("modo sem destino e modo browse", async ({ page }) => {
    await page.goto("/search");
    await expect(
      page.getByRole("heading", { level: 1, name: "Para onde você vai?" }),
    ).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
    await page.goto("/search?destination=Rio+de+Janeiro%2C+RJ");
    await expect(cards(page)).toHaveCount(10);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });
});

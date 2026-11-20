import { expect, type Page, test } from "./fixtures";
import { cards, searchPath } from "./helpers/hotel-search";

// Comparação e favoritos em /en **sem cookie de idioma**: cada link e cada `replaceState` precisa
// manter o prefixo /en, senão o proxy devolve a pessoa ao pt-BR. Sempre se confere `page.url()`.

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "roda no desktop");
});

const pathOf = (page: Page): string => {
  const { pathname } = new URL(page.url());
  return pathname;
};

const names = (page: Page) => page.locator("article h3 a").allInnerTexts();

/** `/en/search` com os critérios e marca os `count` primeiros hotéis para comparar. */
const pickInEnglish = async (page: Page, count: number): Promise<string[]> => {
  await page.goto(`/en${searchPath()}`);
  await expect(cards(page).first()).toBeVisible();
  const picked = (await names(page)).slice(0, count);
  for (const name of picked) await page.getByRole("checkbox", { name: `Compare: ${name}` }).check();
  return picked;
};

test("a bandeja 'Compare' abre /en/compare", async ({ page }) => {
  await pickInEnglish(page, 2);
  await page
    .locator("[data-bottom-bar]")
    .getByRole("link", { name: /^Compare 2 hotels/ })
    .click();
  await expect(page).toHaveURL(/\/en\/compare\?/);
  expect(pathOf(page)).toBe("/en/compare");
});

test("o toast do 4º hotel leva a /en/compare", async ({ page }) => {
  const picked = await pickInEnglish(page, 3);
  const fourth = (await names(page)).find((name) => !picked.includes(name));
  await page.getByRole("checkbox", { name: `Compare: ${fourth}` }).click({ force: true });
  await page.getByRole("button", { name: "View comparison" }).click();
  await expect(page).toHaveURL(/\/en\/compare\?/);
  expect(pathOf(page)).toBe("/en/compare");
});

test("o toast de favorito leva a /en/favorites", async ({ page }) => {
  await page.goto(`/en${searchPath()}`);
  await expect(cards(page).first()).toBeVisible();
  const [first] = await names(page);
  await page.getByRole("button", { name: `Save to favorites: ${first}` }).click();
  await page.getByRole("button", { name: "View favorites" }).click();
  await expect(page).toHaveURL(/\/en\/favorites$/);
  expect(pathOf(page)).toBe("/en/favorites");
});

test("na tabela: hotel da coluna, remover coluna e recarregar ficam em /en", async ({ page }) => {
  const picked = await pickInEnglish(page, 3);
  await page
    .locator("[data-bottom-bar]")
    .getByRole("link", { name: /^Compare 3 hotels/ })
    .click();
  await expect(page).toHaveURL(/\/en\/compare\?/);

  // Em `next dev` a rota compila na primeira visita: só clica depois de hidratar.
  await expect(page.getByRole("table")).toBeVisible();
  await page.waitForLoadState("networkidle");
  const [first, second] = picked;
  await page.getByRole("button", { name: `Remove ${second} from the comparison` }).click();
  await expect(page.getByRole("button", { name: /^Remove .* from the comparison$/ })).toHaveCount(
    2,
    { timeout: 15_000 },
  );
  expect(pathOf(page)).toBe("/en/compare");
  expect(new URL(page.url()).searchParams.getAll("hotel")).toHaveLength(2);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Compare hotels" })).toBeVisible();
  expect(pathOf(page)).toBe("/en/compare");

  await page
    .getByRole("link", { name: first ?? "" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/hotel\/\d+/);
});

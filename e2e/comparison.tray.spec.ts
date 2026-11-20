import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { cards, searchPath } from "./helpers/hotel-search";

// Bandeja de comparação em viewports baixas e abertura da comparação pelo teclado.

const pick = async (page: Page, count: number) => {
  await page.goto(searchPath());
  await expect(cards(page).first()).toBeVisible();
  const names = (await page.locator("article h3 a").allInnerTexts()).slice(0, count);
  for (const name of names) await page.getByRole("checkbox", { name: `Comparar: ${name}` }).check();
  await expect(page.locator("[data-bottom-bar]")).toBeVisible();
};

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "os viewports são definidos no teste");
});

for (const viewport of [
  { width: 640, height: 450 },
  { width: 740, height: 360 },
  { width: 768, height: 900 },
]) {
  test(`a bandeja com 3 hotéis ocupa no máximo 25% de ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await pick(page, 3);
    const box = await page.locator("[data-bottom-bar]").boundingBox();
    expect(box).not.toBeNull();
    expect((box?.height ?? Number.POSITIVE_INFINITY) / viewport.height).toBeLessThanOrEqual(0.25);
  });
}

test("Tab até 'Comparar' + Enter imediato abre /compare no topo com o h1 à vista", async ({
  page,
}) => {
  await pick(page, 2);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  const action = page
    .locator("[data-bottom-bar]")
    .getByRole("link", { name: /^Comparar 2 hotéis/ });
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/compare\?/);
  const title = page.getByRole("heading", { level: 1, name: "Comparar hotéis" });
  await expect(title).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

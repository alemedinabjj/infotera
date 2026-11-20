import { expect, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { hotelPath, noHorizontalScroll, waitForHydration } from "./helpers/hotel-details";
import { test } from "./helpers/mock-api-server";

const expectNoViolations = async (page: Page) => {
  const results = await analyzeAccessibility(page);
  expect(results.violations).toEqual([]);
};

test.describe("axe (wcag2a/aa)", () => {
  test("página com critérios", async ({ page }) => {
    await page.goto(hotelPath(1));
    await waitForHydration(page);
    await expectNoViolations(page);
  });

  test("página sem critérios (formulário de datas aberto)", async ({ page }) => {
    await page.goto(hotelPath(1, false));
    await waitForHydration(page);
    await expect(page.getByLabel(/Check-in/)).toBeVisible();
    await expectNoViolations(page);
  });

  test("hotel esgotado e hotel com 1 quarto", async ({ page }) => {
    await page.goto(hotelPath(19));
    await waitForHydration(page);
    await expectNoViolations(page);
    await page.goto(hotelPath(7));
    await waitForHydration(page);
    await expectNoViolations(page);
  });

  test("lightbox aberto", async ({ page }) => {
    await page.goto(hotelPath(1));
    await waitForHydration(page);
    await page.getByRole("link", { name: "Ver todas as fotos (5)" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoViolations(page);
  });

  test("comparação aberta", async ({ page }) => {
    await page.goto(hotelPath(18));
    await waitForHydration(page);
    await page.getByRole("button", { name: "Comparar quartos (4)" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoViolations(page);
  });

  test("avaliações vazias e hotel não encontrado", async ({ page }) => {
    await page.goto(hotelPath(6));
    await expect(page.getByRole("heading", { name: "Ainda sem comentários" })).toBeVisible();
    await expectNoViolations(page);
    await page.goto("/hotel/999");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hotel não encontrado" }),
    ).toBeVisible();
    await expectNoViolations(page);
  });

  test("erro de seção (avaliações)", async ({ page, failingApi }) => {
    await page.goto(hotelPath(45));
    await waitForHydration(page);
    await page.route(/\/reviews\?.*_page=2/, (route) => {
      const original = new URL(route.request().url());
      return route.continue({ url: `${failingApi.url}${original.pathname}${original.search}` });
    });
    await page.getByRole("button", { name: "Próxima" }).click();
    await expect(
      page.getByRole("heading", { name: "Não foi possível carregar as avaliações." }),
    ).toBeVisible({ timeout: 15_000 });
    await expectNoViolations(page);
  });
});

test.describe("320 px", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("sem scroll horizontal no documento, com e sem lightbox", async ({ page }) => {
    await page.goto(hotelPath(18));
    await waitForHydration(page);
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.getByRole("button", { name: "Comparar quartos (4)" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.getByRole("link", { name: "Ver todas as fotos (5)" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("a região da comparação é focável por Tab e rola dentro de si", async ({ page }) => {
    await page.goto(hotelPath(18));
    await waitForHydration(page);
    await page.getByRole("button", { name: "Comparar quartos (4)" }).click();
    const region = page.getByRole("region", { name: "Comparar quartos (4)" });
    await expect(region).toBeVisible();
    await page.getByRole("checkbox", { name: "Mostrar só diferenças" }).focus();
    await page.keyboard.press("Tab");
    await expect(region).toBeFocused();
    const scrolls = await region.evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(scrolls).toBe(true);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("sem datas: formulário e totais cabem em 320 px", async ({ page }) => {
    await page.goto(hotelPath(1, false));
    await waitForHydration(page);
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.goto(hotelPath(19));
    await waitForHydration(page);
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

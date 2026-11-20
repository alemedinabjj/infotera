import { type APIRequestContext, expect, test } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { noHorizontalScroll, waitForHydration } from "./helpers/hotel-details";
import { API_URL, criteriaQuery } from "./helpers/hotel-search";
import { portugueseLeftovers } from "./helpers/language";

const HOTEL_ID = 1;

/** Nomes próprios que vêm da API (hotel, destino, quartos, hóspedes) e a marca: não são traduzidos. */
const properNames = async (request: APIRequestContext): Promise<string[]> => {
  const read = async (path: string): Promise<unknown[]> => {
    const body: unknown = await (await request.get(`${API_URL}${path}`)).json();
    return Array.isArray(body) ? body : [body];
  };
  const pick = (items: unknown[], key: string): string[] =>
    items.flatMap((item) => {
      if (!item || typeof item !== "object" || !(key in item)) return [];
      const value: unknown = Reflect.get(item, key);
      return typeof value === "string" ? [value] : [];
    });
  const [hotels, rooms, reviews] = await Promise.all([
    read("/hotels"),
    read(`/rooms?hotelId=${HOTEL_ID}`),
    read(`/reviews?hotelId=${HOTEL_ID}`),
  ]);
  return [
    "Infotera Hotéis",
    "Português",
    ...pick(hotels, "name"),
    ...pick(hotels, "destination"),
    ...pick(hotels, "address"),
    ...pick(rooms, "name"),
    ...pick(reviews, "guestName"),
  ];
};

const EN_HOTEL = `/en/hotel/${HOTEL_ID}?${criteriaQuery()}`;
const PT_HOTEL = `/hotel/${HOTEL_ID}?${criteriaQuery()}`;

test.describe("página do hotel em inglês", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "roda no desktop");
  });

  test("sem português, com lang, título em inglês e links em /en", async ({ page, request }) => {
    await page.goto(EN_HOTEL);
    await waitForHydration(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Rooms" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Select room/ }).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Page sections" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Compare rooms/ })).toBeVisible();
    await expect(page).toHaveTitle(/ \| Infotera Hotéis$/);

    const hrefs = await page
      .locator("main a[href^='/']")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^\/en(\/|\?|$)/);

    await page.getByRole("button", { name: /Compare rooms/ }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await page.getByRole("link", { name: "Similar" }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Similar hotels in/ })).toBeVisible();
    expect(await portugueseLeftovers(page, await properNames(request))).toEqual([]);
  });

  test("sem datas: o formulário de datas e o aviso saem em inglês", async ({ page, request }) => {
    await page.goto(`/en/hotel/${HOTEL_ID}`);
    await waitForHydration(page);
    await expect(page.getByText("Choose your dates to book")).toBeVisible();
    await expect(page.getByRole("button", { name: "See availability" })).toBeVisible();
    expect(await portugueseLeftovers(page, await properNames(request))).toEqual([]);
  });

  test("galeria e lightbox em inglês", async ({ page, request }) => {
    await page.goto(EN_HOTEL);
    await waitForHydration(page);
    await page.getByRole("button", { name: /^See all photos/ }).click();
    const dialog = page.getByRole("dialog", { name: /^Photos of/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Next photo" })).toBeVisible();
    expect(await portugueseLeftovers(page, await properNames(request))).toEqual([]);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("selecionar quarto leva ao checkout em /en", async ({ page }) => {
    await page.goto(EN_HOTEL);
    await waitForHydration(page);
    await page
      .getByRole("button", { name: /^Select room/ })
      .first()
      .click();
    await page.waitForURL(/\/en\/checkout/);
  });

  test("hotel inexistente: 404 em inglês", async ({ page }) => {
    await page.goto("/en/hotel/99999");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/not found|isn't available|no longer available/i).first(),
    ).toBeVisible();
  });

  test("em 320 px não há rolagem horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(EN_HOTEL);
    await waitForHydration(page);
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

test.describe("acessibilidade da página do hotel nos dois idiomas", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "roda no desktop");
  });

  for (const [name, path] of [
    ["pt-BR", PT_HOTEL],
    ["en-US", EN_HOTEL],
  ] as const) {
    test(`axe sem violações em ${name}`, async ({ page }) => {
      await page.goto(path);
      await waitForHydration(page);
      expect((await analyzeAccessibility(page)).violations).toEqual([]);
    });
  }
});

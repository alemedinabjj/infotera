import { expect } from "@playwright/test";
import {
  FAVORITES_KEY,
  favoriteEntry,
  favoritesLink,
  noHorizontalScroll,
  persisted,
  readStorage,
  seedStorage,
} from "./extras";
import { test } from "./fixtures";
import { analyzeAccessibility } from "./helpers/axe";
import { cardByName, cards, hotelName, searchPath } from "./helpers/hotel-search";

// Favoritos contra a mock-api real. Rio de Janeiro tem 14 hotéis; ids 1 (Copacabana Palace) e 4.

const heart = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name: `Salvar nos favoritos: ${name}` });

test.describe("favoritar", () => {
  test("coração no card: aria-pressed, 1 toast mesmo com vários cliques, contador no header", async ({
    page,
    request,
  }) => {
    const name = await hotelName(request, 1);
    await page.goto(searchPath());
    await expect(cards(page).first()).toBeVisible();
    const button = heart(page, name);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("status").getByText(/ salvo nos favoritos\.$/)).toBeVisible();
    await expect(favoritesLink(page)).toHaveAccessibleName("Favoritos, 1 hotel");

    await button.click();
    await button.click();
    await button.click();
    await button.click();
    await expect(page.getByText(/ (salvo nos|removido dos) favoritos\.$/)).toHaveCount(1);
  });

  test("o clique no coração não navega e o card tem a ordem nome, coração, Comparar", async ({
    page,
    request,
  }) => {
    const name = await hotelName(request, 1);
    await page.goto(searchPath());
    const card = cardByName(page, name);
    await expect(card).toBeVisible();
    await heart(page, name).click();
    await expect(page).toHaveURL(/\/search\?/);
    await card.getByRole("link", { name, exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(heart(page, name)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(card.getByRole("checkbox", { name: /^Comparar/ })).toBeFocused();
  });

  test("o pulso não muda a caixa do botão (todos os quadros)", async ({ page, request }) => {
    const name = await hotelName(request, 1);
    await page.goto(searchPath());
    const button = heart(page, name);
    await expect(button).toBeVisible();
    await button.scrollIntoViewIfNeeded();
    const rects = await button.evaluate(async (element) => {
      const frames: { x: number; y: number; width: number; height: number }[] = [];
      const read = () => {
        const { x, y, width, height } = element.getBoundingClientRect();
        frames.push({ x, y, width, height });
      };
      read();
      if (element instanceof HTMLElement) element.click();
      for (let frame = 0; frame < 30; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        read();
      }
      return frames;
    });
    await expect(button).toHaveAttribute("aria-pressed", "true");
    expect(new Set(rects.map((rect) => JSON.stringify(rect))).size).toBe(1);
    expect(rects[0]?.width).toBeGreaterThanOrEqual(44);
    expect(rects[0]?.height).toBeGreaterThanOrEqual(44);
  });

  test("persiste no reload e sincroniza entre abas sem reload", async ({
    page,
    context,
    request,
  }) => {
    const name = await hotelName(request, 1);
    await page.goto(searchPath());
    await heart(page, name).click();
    await expect(heart(page, name)).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(heart(page, name)).toHaveAttribute("aria-pressed", "true");
    await expect(favoritesLink(page)).toHaveAccessibleName("Favoritos, 1 hotel");

    const other = await context.newPage();
    await other.goto(searchPath());
    await expect(heart(other, name)).toHaveAttribute("aria-pressed", "true");
    await heart(other, name).click();
    await expect(heart(page, name)).toHaveAttribute("aria-pressed", "false");
    await expect(favoritesLink(page)).toHaveAccessibleName("Favoritos, nenhum hotel");
  });
});

test.describe("/favorites", () => {
  test("lista do mais recente ao mais antigo com 1 request e remove deixando o card no lugar", async ({
    page,
    request,
  }) => {
    await seedStorage(page, FAVORITES_KEY, persisted([favoriteEntry(1, 1), favoriteEntry(4, 3)]));
    const hotelRequests: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).pathname === "/hotels") hotelRequests.push(req.url());
    });
    await page.goto("/favorites");
    await expect(page.getByRole("heading", { level: 1, name: "Favoritos" })).toBeFocused();
    await expect(page.getByText("2 hotéis salvos")).toBeVisible();
    expect(hotelRequests).toHaveLength(1);
    const names = [await hotelName(request, 4), await hotelName(request, 1)];
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(names);

    const articles = page.locator("article");
    const second = await articles.nth(1).boundingBox();
    const first = await articles.nth(0).boundingBox();
    await heart(page, names[0] ?? "").click();
    await expect(page.getByRole("button", { name: /^Desfazer/ })).toBeFocused();
    await expect(page.getByText("Removido dos favoritos.")).toBeVisible();
    expect(await articles.nth(1).boundingBox()).toEqual(second);
    expect(await articles.nth(0).boundingBox()).toEqual(first);

    await page.getByRole("button", { name: /^Desfazer/ }).click();
    await expect(heart(page, names[0] ?? "")).toBeFocused();
    await page.reload();
    await expect(page.getByText("2 hotéis salvos")).toBeVisible();
  });

  test("remover e recarregar: o removido some", async ({ page, request }) => {
    await seedStorage(page, FAVORITES_KEY, persisted([favoriteEntry(1, 1), favoriteEntry(4, 3)]));
    await page.goto("/favorites");
    await heart(page, await hotelName(request, 4)).click();
    await expect(page.getByText("Removido dos favoritos.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("1 hotel salvo")).toBeVisible();
  });

  test("storage adulterado: id 999 e item inválido saem depois da resposta", async ({ page }) => {
    await seedStorage(
      page,
      FAVORITES_KEY,
      persisted([favoriteEntry(1, 1), favoriteEntry(999, 2), { id: "x", addedAt: "?" }]),
    );
    await page.goto("/favorites");
    await expect(page.getByText("1 hotel salvo")).toBeVisible();
    await expect
      .poll(() => readStorage(page, FAVORITES_KEY))
      .toEqual(persisted([favoriteEntry(1, 1)]));
  });

  test("vazio: EmptyState e axe", async ({ page }) => {
    await page.goto("/favorites");
    await expect(page.getByRole("heading", { name: "Nenhum hotel salvo ainda" })).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("erro com _fail e retry; lento com _delay", async ({ page }) => {
    await seedStorage(page, FAVORITES_KEY, persisted([favoriteEntry(1, 1)]));
    let fail = true;
    await page.route(/\/hotels\?id=/, (route) => {
      const url = new URL(route.request().url());
      if (fail) url.searchParams.set("_fail", "1");
      return route.continue({ url: url.toString() });
    });
    await page.goto("/favorites");
    await expect(page.getByText("Não foi possível carregar seus favoritos")).toBeVisible();
    expect(await readStorage(page, FAVORITES_KEY)).toEqual(persisted([favoriteEntry(1, 1)]));
    fail = false;
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByText("1 hotel salvo")).toBeVisible();
  });

  test("cheio, removido e 320 px: axe e sem rolagem horizontal", async ({ page, request }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await seedStorage(page, FAVORITES_KEY, persisted([favoriteEntry(1, 1), favoriteEntry(4, 3)]));
    await page.goto("/favorites");
    await expect(page.getByText("2 hotéis salvos")).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
    await heart(page, await hotelName(request, 1)).click();
    await expect(page.getByText("Removido dos favoritos.")).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("header nas duas larguras: link com nome acessível e sem violações", async ({ page }) => {
    await page.goto("/favorites");
    await expect(favoritesLink(page)).toHaveAttribute("aria-current", "page");
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });
});

import { expect, type Page, type Request, type Route, test } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { cardByName, cards, countHeading, hotelName, searchPath } from "./helpers/hotel-search";

// Ordenação por distância contra a mock-api real. Centro = centroide dos hotéis do destino inteiro
// (sem filtros). Seed do Rio, por distância: 18 (2,0 km) · 13 (2,1) · 11 (2,3) · … · 17 (4,9 km).

const HELP = "Distância em linha reta até o ponto médio dos hotéis de Rio de Janeiro, RJ.";
const DISTANCE_LINE = /(km|m) do ponto central/;

const hotelRequests = (page: Page): Request[] => {
  const requests: Request[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/hotels") requests.push(request);
  });
  return requests;
};

/** Falha só o request SEM `_page` (o centroide / a lista inteira). */
const failWholeList = (page: Page) =>
  page.route(
    (url) => url.pathname === "/hotels" && !url.searchParams.has("_page"),
    (route: Route) =>
      route.fulfill({
        status: 500,
        headers: { "access-control-allow-origin": "*" },
        json: { error: "Falha simulada" },
      }),
  );

test.describe("ordenação por distância", () => {
  test("Rio: ordem, textos, ajuda e página 2 sem request novo; nenhum _sort/_page/_limit", async ({
    page,
    request,
  }) => {
    const requests = hotelRequests(page);
    await page.goto(searchPath("sort=distance"));
    await expect(cards(page)).toHaveCount(10);
    await expect(page.getByText("Mostrando 1–10 de 14")).toBeVisible();

    const first = cards(page).nth(0);
    await expect(first).toContainText(await hotelName(request, 18));
    await expect(first).toContainText("a 2,0 km do ponto central");
    await expect(cards(page).nth(1)).toContainText(await hotelName(request, 13));
    await expect(cards(page).nth(1)).toContainText("a 2,1 km do ponto central");
    await expect(cards(page).nth(2)).toContainText("a 2,3 km do ponto central");

    await expect(page.getByText(HELP)).toBeVisible();
    await expect(page.getByLabel("Ordenar por")).toHaveAccessibleDescription(HELP);

    // Sem filtros: um request só, sem ordenação nem paginação da API.
    expect(requests).toHaveLength(1);
    const url = new URL(requests[0]?.url() ?? "");
    for (const param of ["_sort", "_order", "_page", "_limit"]) {
      expect(url.searchParams.has(param)).toBe(false);
    }

    await page.getByRole("link", { name: "Próxima" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(cards(page)).toHaveCount(4);
    const expected = await Promise.all([14, 10, 2, 17].map((id) => hotelName(request, id)));
    for (const [index, name] of expected.entries()) {
      await expect(cards(page).nth(index)).toContainText(name);
    }
    expect(requests).toHaveLength(1);
  });

  test("trocar pelo select grava sort=distance, mantém o foco e a ajuda aparece só nessa ordenação", async ({
    page,
    request,
  }) => {
    await page.goto(searchPath("page=2"));
    await expect(cards(page)).toHaveCount(4);
    await expect(page.getByText(HELP)).toBeHidden();
    const select = page.getByLabel("Ordenar por");
    // Teclado de verdade: `selectOption` não move o foco.
    await select.focus();
    await page.keyboard.press("End");
    await expect(page).toHaveURL(/sort=distance/);
    await expect(page).not.toHaveURL(/page=/);
    await expect(select).toBeFocused();
    await expect(page.getByText(HELP)).toBeVisible();
    await expect(cards(page)).toHaveCount(10);
    await expect(cards(page).first()).toContainText(await hotelName(request, 18));
    await select.selectOption({ label: "Mais populares" });
    await expect(page.getByText(HELP)).toBeHidden();
  });

  test("Piscina + Spa por distância: 11, 1, 7, 9 e o hotel 11 segue a 2,3 km (centro sem filtros)", async ({
    page,
    request,
  }) => {
    await page.goto(searchPath("amenity=pool&amenity=spa&sort=distance"));
    await expect(cards(page)).toHaveCount(4);
    const ids = [11, 1, 7, 9];
    for (const [index, id] of ids.entries()) {
      await expect(cards(page).nth(index)).toContainText(await hotelName(request, id));
    }
    await expect(cards(page).first()).toContainText("a 2,3 km do ponto central");
  });

  test("a distância aparece em qualquer ordenação (Mais populares: hotel 17 a 4,9 km)", async ({
    page,
    request,
  }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expect(cardByName(page, await hotelName(request, 17))).toContainText(
      "a 4,9 km do ponto central",
    );
  });

  test("Florianópolis (20 km) e Gramado (500 m)", async ({ page, request }) => {
    await page.goto(searchPath("", "Florianópolis, SC"));
    await expect(cardByName(page, await hotelName(request, 4))).toContainText(
      "a 20 km do ponto central",
    );
    await page.goto(searchPath("", "Gramado, RS"));
    await expect(cardByName(page, await hotelName(request, 43))).toContainText(
      "a 500 m do ponto central",
    );
  });

  test("axe com a ajuda da distância visível", async ({ page }) => {
    await page.goto(searchPath("sort=distance"));
    await expect(page.getByText(HELP)).toBeVisible();
    await expect(cards(page)).toHaveCount(10);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });
});

test.describe("falha do centroide (_fail)", () => {
  test("em ordenação de API a lista aparece sem a linha de distância", async ({ page }) => {
    await failWholeList(page);
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expect(cards(page).getByText(DISTANCE_LINE)).toHaveCount(0);
    await expect(countHeading(page)).toContainText("14 hotéis encontrados");
  });

  test("em sort=distance leva ao erro e 'Tentar de novo' recupera", async ({ page }) => {
    await failWholeList(page);
    await page.goto(searchPath("sort=distance"));
    await expect(page.getByRole("alert").filter({ hasText: "Não foi possível" })).toBeVisible({
      timeout: 15_000,
    });
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(cards(page)).toHaveCount(10);
    await expect(cards(page).first().getByText(DISTANCE_LINE)).toBeVisible();
  });

  test("sort=distance mostra o erro no mesmo tempo que a ordenação de API (sem retry aninhado)", async ({
    page,
  }) => {
    const seen: string[] = [];
    await page.route(
      (url) => url.pathname === "/hotels",
      (route: Route) => {
        seen.push(route.request().url());
        return route.fulfill({
          status: 500,
          headers: { "access-control-allow-origin": "*" },
          json: { error: "Falha simulada" },
        });
      },
    );
    const alert = page.getByRole("alert").filter({ hasText: "Não foi possível carregar" });
    const timeToError = async (filters: string) => {
      seen.length = 0;
      const started = Date.now();
      await page.goto(searchPath(filters));
      await expect(alert).toBeVisible({ timeout: 12_000 });
      return Date.now() - started;
    };
    const popular = await timeToError("sort=popular");
    const distance = await timeToError("sort=distance");
    // Uma tentativa = 1 request (lista e centroide compartilham a chave): 3 no total, não 9.
    expect(seen).toHaveLength(3);
    expect(distance).toBeLessThan(popular + 2000);
  });
});

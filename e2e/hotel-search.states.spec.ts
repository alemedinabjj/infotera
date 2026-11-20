import { expect, type Page, type Route } from "@playwright/test";
import {
  CHECK_IN,
  CHECK_OUT,
  cards,
  countHeading,
  criteriaQuery,
  holdRequests,
  searchPath,
} from "./helpers/hotel-search";
import { test } from "./helpers/mock-api-server";

// Estados da lista contra a mock-api real. Lentidão e falha reescrevem só o host das chamadas a
// `/hotels?` para as mock-apis com flags próprias do fixture (--delay 2000 / --fail-rate 1).

const HOTELS_LIST = /\/hotels\?/;

const redirectHotelsTo = async (page: Page, apiUrl: string, extraQuery = "") => {
  const handler = (route: Route) => {
    const original = new URL(route.request().url());
    const search = extraQuery ? `${original.search}&${extraQuery}` : original.search;
    return route.continue({ url: `${apiUrl}${original.pathname}${search}` });
  };
  await page.route(HOTELS_LIST, handler);
  return handler;
};

test.describe("vazios", () => {
  test("destino sem hotéis (Bonito, MS) mostra o vazio útil com 'Fazer nova busca'", async ({
    page,
  }) => {
    await page.goto(searchPath("", "Bonito, MS"));
    await expect(page.getByRole("heading", { name: "Nenhum hotel em Bonito, MS" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute("href", "/");
    await expect(
      page.getByRole("heading", { level: 2, name: "Nenhum hotel encontrado" }),
    ).toBeVisible();
  });

  test("filtros sem resultado: 'Limpar filtros' restaura a lista e foca a contagem", async ({
    page,
  }) => {
    await page.goto(searchPath("amenity=pool&amenity=spa&amenity=kids_club"));
    await expect(
      page.getByRole("heading", { name: "Nenhum hotel com esses filtros" }),
    ).toBeVisible();
    await page.getByRole("status").getByRole("button", { name: "Limpar filtros" }).click();
    await expect(cards(page)).toHaveCount(10);
    await expect(countHeading(page)).toBeFocused();
    await expect(page).not.toHaveURL(/amenity/);
  });
});

test.describe("modos da página", () => {
  test("sem destino: h1, formulário e envio levam ao modo estadia", async ({ page }) => {
    await page.goto("/search");
    await expect(
      page.getByRole("heading", { level: 1, name: "Para onde você vai?" }),
    ).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    const destination = page.getByRole("combobox", { name: /Destino/ });
    await destination.focus();
    await destination.pressSequentially("rio", { delay: 30 });
    await page.getByRole("option", { name: /Rio de Janeiro, RJ/ }).click();
    await page.getByLabel(/Check-in/).fill(CHECK_IN);
    await page.getByLabel(/Check-out/).fill(CHECK_OUT);
    await page.getByRole("button", { name: "Buscar hotéis" }).click();
    await expect(page).toHaveURL(/\/search\?destination=Rio\+de\+Janeiro/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Hotéis em Rio de Janeiro, RJ" }),
    ).toBeVisible();
    await expect(cards(page)).toHaveCount(10);
  });

  test("destino sem datas (browse): lista sem total, aviso e formulário aberto", async ({
    page,
  }) => {
    await page.goto("/search?destination=Rio+de+Janeiro%2C+RJ");
    await expect(cards(page)).toHaveCount(10);
    await expect(page.getByText("Datas não definidas")).toBeVisible();
    await expect(page.getByText("Escolha as datas da estadia")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Destino/ })).toHaveValue("Rio de Janeiro, RJ");
    await expect(page.getByText(/total com taxas ·/)).toHaveCount(0);
    await expect(cards(page).first().getByRole("link")).toHaveAttribute("href", /^\/hotel\/\d+$/);
  });

  test("params inválidos são ignorados e o preço invertido vira 200–900", async ({
    page,
    isMobile,
  }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));
    const response = await page.goto(
      searchPath("minRating=abc&page=-1&amenity=sauna&sort=x&minPrice=900&maxPrice=200"),
    );
    expect(response?.status()).toBe(200);
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByLabel("Ordenar por")).toHaveValue("popular");
    if (!isMobile) {
      await expect(page.getByLabel("Mínimo")).toHaveValue("200");
      await expect(page.getByLabel("Máximo")).toHaveValue("900");
      await expect(page.getByRole("radio", { name: "Qualquer nota" })).toBeChecked();
    }
    expect(errors).toEqual([]);
  });

  test("no modo estadia o link do card leva os critérios da busca", async ({ page }) => {
    await page.goto(searchPath());
    await expect(cards(page).first().getByRole("link")).toHaveAttribute(
      "href",
      new RegExp(`^/hotel/17\\?${criteriaQuery().replaceAll("+", "\\+")}`),
    );
  });
});

test.describe("API lenta (_delay)", () => {
  // A resposta fica retida por um portão (`holdRequests`) até as asserções terminarem: nada
  // depende de quanto tempo a API "demora".
  test("skeleton com aria-busy e anúncio, depois a lista", async ({ page }) => {
    const gate = await holdRequests(page, HOTELS_LIST);
    await page.goto(searchPath());
    await expect(page.locator("ul[aria-busy='true']").first()).toBeVisible();
    await expect(page.getByText("Carregando hotéis…").first()).toBeVisible();
    gate.release();
    await expect(cards(page)).toHaveCount(10);
    await expect(page.locator("ul[aria-busy='true']")).toHaveCount(0);
  });

  test("depois de 5 s carregando avisa que está demorando", async ({ page }) => {
    const gate = await holdRequests(page, HOTELS_LIST);
    await page.goto(searchPath());
    await expect(page.getByText("Carregando hotéis…").first()).toBeVisible();
    await expect(page.getByText("Está demorando mais que o normal…").first()).toBeVisible({
      timeout: 10_000,
    });
    gate.release();
    await expect(cards(page)).toHaveCount(10);
  });

  test("trocar o filtro com API lenta mantém a lista anterior e mostra 'Atualizando resultados…'", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "o filtro do celular é coberto em hotel-search.mobile.spec.ts");
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    const gate = await holdRequests(page, HOTELS_LIST);
    await page.getByRole("checkbox", { name: "Piscina" }).check();
    await expect(page.getByText("Atualizando resultados…")).toBeVisible();
    await expect(cards(page)).toHaveCount(10);
    await expect(page.locator("ul[aria-busy='true']")).toBeVisible();
    gate.release();
    await expect(cards(page)).toHaveCount(7);
    await expect(page.getByText("Atualizando resultados…")).toHaveCount(0);
  });
});

test.describe("API com falha (_fail)", () => {
  test("500 mostra o erro depois das tentativas e 'Tentar de novo' recupera", async ({
    page,
    failingApi,
  }) => {
    const handler = await redirectHotelsTo(page, failingApi.url);
    await page.goto(searchPath());
    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível carregar os hotéis" });
    await expect(alert).toBeVisible({ timeout: 12_000 });
    await expect(alert).not.toContainText("Falha simulada");
    await page.unroute(HOTELS_LIST, handler);
    await alert.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(cards(page)).toHaveCount(10);
    await expect(alert).toHaveCount(0);
  });

  test("filtros continuam operáveis durante o erro", async ({ page, failingApi, isMobile }) => {
    test.skip(isMobile, "o filtro do celular é coberto em hotel-search.mobile.spec.ts");
    await redirectHotelsTo(page, failingApi.url);
    await page.goto(searchPath());
    await expect(page.getByRole("alert").filter({ hasText: "Não foi possível" })).toBeVisible({
      timeout: 12_000,
    });
    await page.getByRole("checkbox", { name: "Wi-Fi" }).check();
    await expect(page).toHaveURL(/amenity=wifi/);
  });
});

test.describe("sem rede", () => {
  test("offline ao trocar o filtro: some a lista antiga e aparece o aviso", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "o filtro do celular é coberto em hotel-search.mobile.spec.ts");
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await context.setOffline(true);
    await page.getByRole("checkbox", { name: "Piscina" }).check();
    // `exact`: o banner global ("Você está sem internet. Mostramos…") também contém a frase.
    await expect(page.getByText("Você está sem internet.", { exact: true })).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    await context.setOffline(false);
    await expect(cards(page)).toHaveCount(7);
  });
});

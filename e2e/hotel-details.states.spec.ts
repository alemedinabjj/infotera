import { expect, type Page, type Route } from "@playwright/test";
import { hotelPath, waitForHydration } from "./helpers/hotel-details";
import { test } from "./helpers/mock-api-server";

// Hotel 45 (Gramado): 14 comentários → 3 páginas (5, 5, 4). Hotel 6: 0 comentários, reviewCount 456.
// A 1ª página vem do servidor (não passa pelo `page.route`); as trocas de página são requests do
// navegador e podem ser redirecionadas para as mock-apis com flags próprias do fixture.

const REVIEWS_PAGE_2 = /\/reviews\?.*_page=2/;

const redirectTo = async (page: Page, apiUrl: string) => {
  const handler = (route: Route) => {
    const original = new URL(route.request().url());
    return route.continue({ url: `${apiUrl}${original.pathname}${original.search}` });
  };
  await page.route(REVIEWS_PAGE_2, handler);
  return handler;
};

const next = (page: Page) => page.getByRole("button", { name: "Próxima" });

test.describe("hotel não encontrado", () => {
  for (const id of ["999", "abc"]) {
    test(`/hotel/${id}: h1, link, noindex e título`, async ({ page, request }) => {
      // A meta vem no HTML do servidor (o React a move no cliente): lê a resposta crua.
      const html = await (await request.get(`/hotel/${id}`)).text();
      expect(html).toContain('<meta name="robots" content="noindex"');

      await page.goto(`/hotel/${id}`);
      await expect(
        page.getByRole("heading", { level: 1, name: "Hotel não encontrado" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute(
        "href",
        "/",
      );
      await expect(page).toHaveTitle("Hotel não encontrado | Infotera Hotéis");
    });
  }
});

test.describe("avaliações", () => {
  test("hotel 45: 14 comentários em 3 páginas, a última com 4", async ({ page }) => {
    await page.goto(hotelPath(45));
    await waitForHydration(page);
    const reviews = page.locator("#avaliacoes");
    await expect(reviews.getByText("Mostrando 1–5 de 14 comentários")).toBeVisible();
    await expect(reviews.getByRole("article")).toHaveCount(5);
    await expect(reviews.getByRole("navigation", { name: "Paginação" })).toContainText(
      "Página 1 de 3",
    );
    await next(page).click();
    await expect(reviews.getByText("Mostrando 6–10 de 14 comentários")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Avaliações" })).toBeFocused();
    await next(page).click();
    await expect(reviews.getByText("Mostrando 11–14 de 14 comentários")).toBeVisible();
    await expect(reviews.getByRole("article")).toHaveCount(4);
  });

  test("hotel 6: vazio, e a nota do cabeçalho continua com 456 avaliações", async ({ page }) => {
    await page.goto(hotelPath(6));
    await expect(page.getByRole("heading", { name: "Ainda sem comentários" })).toBeVisible();
    await expect(
      page.getByText("Este hotel ainda não recebeu comentários de hóspedes."),
    ).toBeVisible();
    await expect(page.getByText("456 avaliações").first()).toBeVisible();
  });

  test("lenta: a página 1 segue visível com 'Atualizando…' e a paginação na 1; depois a 2", async ({
    page,
    slowApi,
  }) => {
    await page.goto(hotelPath(45));
    await waitForHydration(page);
    await redirectTo(page, slowApi.url);
    const reviews = page.locator("#avaliacoes");
    await next(page).click();
    await expect(reviews.getByText("Atualizando avaliações…")).toBeVisible();
    await expect(reviews.getByRole("article")).toHaveCount(5);
    await expect(reviews.getByText("Mostrando 1–5 de 14 comentários")).toHaveCount(0);
    await expect(reviews.getByRole("navigation", { name: "Paginação" })).toContainText(
      "Página 1 de 3",
    );
    await expect(reviews.getByText("Mostrando 6–10 de 14 comentários")).toBeVisible();
    await expect(reviews.getByText("Atualizando avaliações…")).toHaveCount(0);
  });

  test("falha na troca: erro depois das tentativas; 'Tentar de novo' mostra 'Tentando…' e traz a página 2", async ({
    page,
    failingApi,
  }) => {
    await page.goto(hotelPath(45));
    await waitForHydration(page);
    const handler = await redirectTo(page, failingApi.url);
    const reviews = page.locator("#avaliacoes");
    await next(page).click();
    await expect(
      reviews.getByRole("heading", { name: "Não foi possível carregar as avaliações." }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(reviews.getByText("Falha simulada")).toHaveCount(0);

    await page.unroute(REVIEWS_PAGE_2, handler);
    const retry = reviews.getByRole("button", { name: "Tentar de novo" });
    await retry.click();
    await expect(reviews.getByText("Mostrando 6–10 de 14 comentários")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Avaliações" })).toBeFocused();
  });

  test("offline na troca: aviso acima da página atual; ao voltar online chega a página 2", async ({
    page,
    context,
  }) => {
    await page.goto(hotelPath(45));
    await waitForHydration(page);
    const reviews = page.locator("#avaliacoes");
    await context.setOffline(true);
    await next(page).click();
    await expect(reviews.getByText("Você está sem internet.")).toBeVisible();
    await expect(
      reviews.getByText("As avaliações aparecem assim que a conexão voltar."),
    ).toBeVisible();
    await expect(reviews.getByRole("article")).toHaveCount(5);
    await expect(reviews.getByRole("navigation", { name: "Paginação" })).toContainText(
      "Página 1 de 3",
    );
    await context.setOffline(false);
    await expect(reviews.getByText("Mostrando 6–10 de 14 comentários")).toBeVisible();
    await expect(reviews.getByText("Você está sem internet.")).toHaveCount(0);
  });
});

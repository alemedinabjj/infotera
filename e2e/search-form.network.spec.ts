import { expect, type Page, type Route } from "@playwright/test";
import { test } from "./helpers/mock-api-server";

// Critérios 4, 5, 6, 7 contra mock-api REAL com flags próprias (--delay 2000 / --fail-rate 1).
// O Playwright só troca o host dos requests de /suggestions; quem responde é o server.js.

const destination = (page: Page) => page.getByRole("combobox", { name: /Destino/ });

const redirectSuggestionsTo = async (page: Page, apiUrl: string) => {
  const handler = (route: Route) => {
    const original = new URL(route.request().url());
    return route.continue({ url: `${apiUrl}${original.pathname}${original.search}` });
  };
  await page.route("**/suggestions**", handler);
  return handler;
};

const type = async (page: Page, text: string) => {
  await destination(page).focus();
  await destination(page).pressSequentially(text, { delay: 30 });
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Buscar hotéis" })).toBeVisible();
});

test("critério 4/5: API com --delay 2000 mostra loading, depois resultados e o anúncio", async ({
  page,
  slowApi,
}) => {
  await redirectSuggestionsTo(page, slowApi.url);
  await type(page, "flor");
  await expect(page.getByText("Buscando destinos…").first()).toBeVisible();
  await expect(destination(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("option", { name: /Florianópolis, SC/ })).toBeVisible({
    timeout: 6000,
  });
  await expect(page.getByText("1 destino encontrado")).toHaveCount(1);
  await expect(page.getByText("Buscando destinos…")).toHaveCount(0);
});

test("critério 4: com resultados anteriores, a nova busca lenta mantém a lista visível", async ({
  page,
  slowApi,
}) => {
  await type(page, "sao");
  await expect(page.getByRole("option", { name: /São Paulo, SP/ })).toBeVisible();
  await redirectSuggestionsTo(page, slowApi.url);
  const slowRequest = page.waitForRequest(
    (request) => request.url().includes("/suggestions") && request.url().includes("q=saop"),
  );
  await destination(page).pressSequentially("p", { delay: 30 });
  await slowRequest; // a busca lenta já saiu (debounce passou) e ainda não respondeu (2 s)
  // Enquanto a nova busca (lenta) não volta, a lista anterior segue na tela.
  await expect(page.getByRole("option").first()).toBeVisible();
  await expect(page.getByText("Buscando destinos…")).toHaveCount(0);
});

test("critério 7: API com --fail-rate 1 mostra o erro e o retry recupera ao voltar a API", async ({
  page,
  failingApi,
}) => {
  const handler = await redirectSuggestionsTo(page, failingApi.url);
  await type(page, "flor");
  const retry = page.getByRole("button", { name: "Tentar de novo" });
  await expect(retry).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Não foi possível carregar os destinos.").first()).toBeVisible();
  // O corpo da API ("Falha simulada…") nunca vai para a UI.
  await expect(page.getByText("Falha simulada")).toHaveCount(0);

  // Retry enquanto a API ainda falha: continua no erro (não trava, não some).
  await retry.click();
  await expect(retry).toBeVisible({ timeout: 15_000 });

  // API volta: o retry recupera.
  await page.unroute("**/suggestions**", handler);
  await retry.click();
  await expect(page.getByRole("option", { name: /Florianópolis, SC/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0);
});

test("critério 7: após falha, digitar outro termo busca de novo sem recarregar a página", async ({
  page,
  failingApi,
}) => {
  const handler = await redirectSuggestionsTo(page, failingApi.url);
  await type(page, "flor");
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible({
    timeout: 15_000,
  });
  await page.unroute("**/suggestions**", handler);
  await destination(page).fill("");
  await type(page, "sao");
  await expect(page.getByRole("option", { name: /São Paulo, SP/ })).toBeVisible();
});

test("critério 6: busca sem resultado contra a API real mostra a linha vazia", async ({ page }) => {
  await type(page, "xyz");
  await expect(page.getByText('Nenhum destino encontrado para "xyz"').first()).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(0);
});

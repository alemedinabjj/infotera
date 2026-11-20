import { expect, type Locator, type Page, type Request } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { cards, countHeading, holdRequests, hotelName, searchPath } from "./helpers/hotel-search";
import { test } from "./helpers/mock-api-server";

// Rolagem contínua (view=infinite) contra a mock-api real: Rio tem 14 hotéis, lotes de 10.
// `_delay`/`_fail` redirecionam só o request do 2º lote (`_page=2`) para as mock-apis do fixture.

const END = "Você viu todos os 14 hotéis.";
const SECOND_BATCH = /\/hotels\?.*_page=2/;

const feedPath = (filters = "") => searchPath(`view=infinite${filters ? `&${filters}` : ""}`);
const cardAt = (page: Page, position: number): Locator =>
  page.locator(`article[aria-posinset='${position}']`);
const loadMoreButton = (page: Page): Locator =>
  page.getByRole("button", { name: "Carregar mais hotéis" });
const announcer = (page: Page): Locator => page.locator("p.sr-only[aria-live='polite']");

const toBottom = (page: Page) =>
  page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

/** Rola até o fim e espera o 2º lote chegar (o rodapé vira "Você viu todos os 14 hotéis."). */
const loadEverything = async (page: Page) => {
  await toBottom(page);
  await expect(page.getByText(END)).toBeAttached();
  // O lote novo aumenta a página: rola de novo até o fim.
  await toBottom(page);
  await expect(page.getByText(END)).toBeVisible();
};

const hotelRequests = (page: Page): Request[] => {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/hotels") requests.push(request);
  });
  return requests;
};

const redirectSecondBatch = (page: Page, apiUrl: string) =>
  page.route(SECOND_BATCH, (route) => {
    const original = new URL(route.request().url());
    return route.continue({ url: `${apiUrl}${original.pathname}${original.search}` });
  });

const expectNoHorizontalScroll = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
};

test.describe("modo de exibição", () => {
  test("'Rolagem contínua' grava view=infinite sem page, mantém o foco e não pede nada de novo", async ({
    page,
  }) => {
    await page.goto(searchPath("page=2"));
    await expect(cards(page)).toHaveCount(4);
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    const requests = hotelRequests(page);

    const select = page.getByLabel("Exibir");
    await select.focus();
    await page.keyboard.press("End");
    await expect(page).toHaveURL(/view=infinite/);
    await expect(page).not.toHaveURL(/page=/);
    await expect(select).toBeFocused();
    await expect(page.getByRole("feed")).toBeVisible();
    await expect(cardAt(page, 1)).toHaveAttribute("aria-setsize", "14");
    await expect(page.getByText("Mostrando 10 de 14").first()).toBeVisible();
    await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
    expect(requests).toHaveLength(0);

    await page.keyboard.press("Home");
    await expect(page).not.toHaveURL(/view=/);
    await expect(page.getByRole("navigation", { name: "Paginação" })).toBeVisible();
    expect(requests).toHaveLength(0);
  });

  test("recarregar restaura o modo; view inválido volta a páginas; page é ignorado", async ({
    page,
  }) => {
    await page.goto(feedPath());
    await expect(page.getByRole("feed")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("feed")).toBeVisible();
    await expect(page.getByLabel("Exibir")).toHaveValue("infinite");
    await page.goto(searchPath("view=xyz"));
    await expect(cards(page)).toHaveCount(10);
    await expect(page.getByRole("feed")).toHaveCount(0);
    await page.goto(feedPath("page=2"));
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByText("Mostrando 10 de 14").first()).toBeVisible();
  });
});

test.describe("feed e carregamento", () => {
  test("role=feed rotulado pelo h2, posinset/setsize e sem paginação", async ({ page }) => {
    await page.goto(feedPath());
    const feed = page.getByRole("feed");
    await expect(feed).toBeVisible();
    await expect(feed).toHaveAccessibleName(/14 hotéis encontrados/);
    await expect(cardAt(page, 1)).toHaveAttribute("aria-setsize", "14");
    await expect(page.getByRole("navigation", { name: "Paginação" })).toHaveCount(0);
    await expect(page.getByText("Mostrando 10 de 14").first()).toBeVisible();
  });

  test("rolar até perto do fim pede o 2º lote sozinho e anuncia", async ({ page }) => {
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    const second = page.waitForRequest(SECOND_BATCH);
    await toBottom(page);
    await second;
    await expect(announcer(page)).toHaveText("Mais 4 hotéis carregados. Mostrando 14 de 14.");
    await expect(page.getByText(END)).toBeVisible();
    await expect(page.getByRole("button", { name: "Voltar ao topo" })).toBeVisible();
    await toBottom(page);
    await expect(cardAt(page, 14)).toBeVisible();
  });

  test("virtualização: menos de 14 article no DOM, e o card 14 existe ao rolar até o fim", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await loadEverything(page);
    await expect(cardAt(page, 14)).toBeVisible();
    expect(await cards(page).count()).toBeLessThan(14);
    await expect(cardAt(page, 1)).toHaveCount(0);
  });

  test("o card com foco continua focado ao rolar a roda do mouse até ele sair da tela", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "roda do mouse só no desktop");
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await loadEverything(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    const first = cardAt(page, 1);
    await expect(first).toBeVisible();
    await first.focus();
    await expect(first).toBeFocused();
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 6000);
    await expect(cardAt(page, 14)).toBeVisible();
    await expect(first).toBeAttached();
    await expect(first).toBeFocused();
  });

  test("sair da página e voltar mostra os 14 já carregados (cache), sem skeleton nem request", async ({
    page,
  }) => {
    // Navegação suave pelo header (a rota do detalhe é da F4); o cache do TanStack mantém os lotes.
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await loadEverything(page);
    const requests = hotelRequests(page);
    await page.getByRole("banner").getByRole("link").first().click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/view=infinite/);
    await expect(page.getByRole("feed")).toBeVisible();
    await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
    await expect(countHeading(page)).toContainText("14 hotéis encontrados");
    await expect(page.getByText(END)).toBeAttached();
    expect(requests).toHaveLength(0);
  });

  test("trocar a ordenação volta ao 1º lote", async ({ page }) => {
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await loadEverything(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByLabel("Ordenar por").selectOption({ label: "Menor preço" });
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page.getByText("Mostrando 10 de 14").first()).toBeVisible();
    await expect(loadMoreButton(page)).toBeAttached();
  });
});

test.describe("teclado", () => {
  test("Enter no 'Carregar mais hotéis' leva o foco ao 11º card, abaixo do header", async ({
    page,
  }) => {
    // Sem IntersectionObserver o botão é o único caminho (o app suporta isso). Com o observer, o
    // rodapé visível dispara o carregamento automático ANTES do `focus()` sob carga e o foco, que
    // só segue o lote pedido com o botão focado, não se move: o teste dependia dessa corrida.
    await page.addInitScript(() => {
      Reflect.deleteProperty(window, "IntersectionObserver");
    });
    const gate = await holdRequests(page, SECOND_BATCH);
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    const button = loadMoreButton(page);
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Carregando mais hotéis…" })).toBeFocused();
    gate.release();
    const eleventh = cardAt(page, 11);
    await expect(eleventh).toBeFocused();
    const header = await page.getByRole("banner").boundingBox();
    const box = await eleventh.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0) - 1);
  });

  test("PageDown/PageUp, Ctrl+End e Ctrl+Home (inclusive a partir do rodapé)", async ({ page }) => {
    // 2º lote retido: o botão fica na tela (com o rodapé à vista o carregamento automático o troca).
    const gate = await holdRequests(page, SECOND_BATCH);
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await cardAt(page, 1).focus();
    await page.keyboard.press("PageDown");
    await expect(cardAt(page, 2)).toBeFocused();
    await page.keyboard.press("PageUp");
    await expect(cardAt(page, 1)).toBeFocused();
    await page.keyboard.press("Control+End");
    await expect(page.getByRole("button", { name: /^Carrega(r|ndo) mais hotéis/ })).toBeFocused();
    // Ctrl+Home direto do rodapé: o contêiner do teclado envolve o feed e o rodapé.
    await page.keyboard.press("Control+Home");
    await expect(countHeading(page)).toBeFocused();
    await page.evaluate(() => window.scrollTo(0, 0));
    await cardAt(page, 1).focus();
    await page.keyboard.press("Control+Home");
    await expect(countHeading(page)).toBeFocused();
    gate.release();
  });
});

test.describe("estados do lote (_delay e _fail)", () => {
  test("lento: aria-busy e 'Carregando mais hotéis…' até chegar", async ({ page }) => {
    const gate = await holdRequests(page, SECOND_BATCH);
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await toBottom(page);
    await expect(page.getByRole("feed")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("button", { name: "Carregando mais hotéis…" })).toBeVisible();
    // O botão já diz "Carregando…": o anunciador geral fica mudo (sem leitura dupla).
    await expect(announcer(page)).toHaveText("");
    gate.release();
    await expect(page.getByText(END)).toBeVisible();
    await expect(page.getByRole("feed")).toHaveAttribute("aria-busy", "false");
  });

  test("falha: os 10 cards ficam, o automático não repete e 'Tentar de novo' carrega", async ({
    page,
    failingApi,
  }) => {
    const requests = hotelRequests(page);
    await redirectSecondBatch(page, failingApi.url);
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await toBottom(page);
    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível carregar mais hotéis." });
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toContainText("Os hotéis já carregados continuam aqui.");
    // A mensagem é trazida à vista (nearest) e o foco não é movido.
    await expect(alert).toBeInViewport();
    const attempts = requests.filter((item) => SECOND_BATCH.test(item.url())).length;
    await toBottom(page);
    await page.evaluate(() => window.scrollBy(0, -50));
    await toBottom(page);
    expect(requests.filter((item) => SECOND_BATCH.test(item.url()))).toHaveLength(attempts);

    await page.unrouteAll({ behavior: "ignoreErrors" });
    const retry = page.getByRole("button", { name: "Tentar de novo" });
    await retry.focus();
    await retry.click();
    await expect(page.getByText(END)).toBeVisible();
    await expect(cardAt(page, 11)).toBeFocused();
  });
});

test.describe("sort=distance + feed", () => {
  test("lotes 1 e 2 na ordem por distância; o 2º lote não faz request", async ({
    page,
    request,
  }) => {
    const requests = hotelRequests(page);
    await page.goto(feedPath("sort=distance"));
    await expect(cardAt(page, 1)).toContainText(await hotelName(request, 18));
    expect(requests).toHaveLength(1);
    await loadEverything(page);
    await expect(cardAt(page, 14)).toContainText(await hotelName(request, 17));
    expect(requests).toHaveLength(1);
  });
});

test.describe("mobile e movimento", () => {
  test("320 px: toolbar, feed e rodapé sem scroll horizontal; botão com alvo >= 44 px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Filtros/ })).toBeVisible();
    await expect(page.getByLabel("Ordenar por")).toBeVisible();
    await expect(page.getByLabel("Exibir")).toBeVisible();
    await expectNoHorizontalScroll(page);
    const button = loadMoreButton(page);
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalScroll(page);
    await loadEverything(page);
    await expectNoHorizontalScroll(page);
  });

  test("prefers-reduced-motion: 'Voltar ao topo' rola sem animação e foca o título", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await loadEverything(page);
    await page.getByRole("button", { name: "Voltar ao topo" }).click();
    await expect(countHeading(page)).toBeFocused();
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(400);
  });
});

test.describe("acessibilidade (axe wcag2a/aa)", () => {
  test("feed com os 14 carregados", async ({ page }) => {
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await loadEverything(page);
    // O card novo entra com fade de opacidade: o axe medido no meio da animação vê cor misturada.
    await expect(cardAt(page, 14)).toHaveCSS("opacity", "1");
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("rodapé com erro no lote", async ({ page, failingApi }) => {
    await redirectSecondBatch(page, failingApi.url);
    await page.goto(feedPath());
    await expect(cardAt(page, 1)).toBeVisible();
    await toBottom(page);
    await expect(
      page.getByRole("alert").filter({ hasText: "Não foi possível carregar mais hotéis." }),
    ).toBeVisible({ timeout: 15_000 });
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });
});

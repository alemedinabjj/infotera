import { expect, type Page } from "@playwright/test";
import { hotelPath, waitForHydration } from "./helpers/hotel-details";
import { controlledHotel, hotelRequest, test } from "./helpers/server-api";

// Critérios 18 e U6: o modal da foto com a rota lenta, falhando e sem internet.

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const SLOW_MS = 3000;

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com/, (route) =>
    route.fulfill({ contentType: "image/gif", body: PIXEL }),
  );
});

const loadingDialog = (page: Page) => page.getByRole("dialog", { name: "Fotos do hotel" });

/**
 * Atrasa só os requests RSC da foto 1 (header `rsc`; o documento e os assets passam direto). Vale
 * **antes** de abrir o hotel: no build o Next já prefetch a rota ao ver o link, e é esse prefetch lento
 * que o clique espera.
 */
const slowPhotoRoute = (page: Page) =>
  page.route(/\/hotel\/1\/photos\/1/, async (route) => {
    if (route.request().headers().rsc) await new Promise((r) => setTimeout(r, SLOW_MS));
    await route.continue();
  });

const openHotel = async (page: Page, hotelId: number) => {
  await page.goto(hotelPath(hotelId));
  await waitForHydration(page);
  return page.getByRole("link", { name: /Ver todas as fotos/ });
};

test.describe("rota da foto lenta (critério 18)", () => {
  test("o modal de carregamento aparece na hora do clique, com Fechar, spinner e texto", async ({
    page,
  }) => {
    await slowPhotoRoute(page);
    const seeAll = await openHotel(page, 1);
    const clickedAt = Date.now();
    await seeAll.click();
    const loading = loadingDialog(page);
    await expect(loading).toBeVisible();
    // A moldura de carregamento não espera a rota: aparece bem antes de ela chegar (folga de 1 s).
    expect(Date.now() - clickedAt).toBeLessThan(SLOW_MS - 1000);
    await expect(loading.getByText("Carregando foto…")).toBeVisible();
    await expect(loading.getByRole("button", { name: "Fechar" })).toBeVisible();
    expect(await loading.evaluate((el) => el.matches(":modal"))).toBe(true);
    await expect(
      page.getByRole("dialog", { name: "Fotos de Hotel Copacabana Palace" }),
    ).toBeVisible({ timeout: SLOW_MS + 5000 });
    await expect(loading).toHaveCount(0);
  });

  test("Fechar durante o carregamento: a chegada tardia da rota não reabre o modal", async ({
    page,
  }) => {
    await slowPhotoRoute(page);
    // Vale antes do clique: no build é o prefetch lento que a navegação espera.
    const lateRoute = page.waitForResponse(
      (response) =>
        /\/hotel\/1\/photos\/1/.test(response.url()) && !!response.request().headers().rsc,
    );
    const seeAll = await openHotel(page, 1);
    const hotelUrl = page.url();
    const entries = await page.evaluate(() => history.length);
    await seeAll.click();
    await loadingDialog(page).getByRole("button", { name: "Fechar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // A rota chega depois da desistência: o Next empurra `/photos/1` e o app volta uma entrada. O que
    // prova o ciclo inteiro é o histórico ter ganhado a entrada da foto (para frente) com a URL de volta
    // no hotel; um modal reaberto deixaria a URL em `/photos/1`.
    await lateRoute;
    await expect
      .poll(async () => ({ url: page.url(), entries: await page.evaluate(() => history.length) }))
      .toEqual({ url: hotelUrl, entries: entries + 1 });
    await expect(page).toHaveURL(/\/hotel\/1\?/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(seeAll).toBeFocused();

    await page.goForward();
    await expect(page.getByRole("dialog", { name: /^Fotos de / })).toBeVisible();
    await expect(page).toHaveURL(/\/hotel\/1\/photos\/1$/);
  });
});

test.describe("rota da foto falhando (U6)", () => {
  test.skip(
    process.env.E2E_PROD === "1",
    "o build serve o hotel do cache: o servidor não chama a API",
  );

  test("RSC 500: cartão claro com 'Tentar de novo' focado; Fechar volta; retry abre a foto", async ({
    page,
    serverApi,
  }, workerInfo) => {
    const hotelId = controlledHotel(workerInfo.parallelIndex);
    const seeAll = await openHotel(page, hotelId);
    const failing = await serverApi.failServerRequests(hotelRequest(hotelId));
    await seeAll.click();
    const dialog = loadingDialog(page);
    await expect(dialog.getByRole("alert")).toContainText("Não foi possível abrir a foto");
    await expect(dialog.getByRole("button", { name: "Tentar de novo" })).toBeFocused();
    expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
    await serverApi.release(failing);
    await serverApi.reset();
    await dialog.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByRole("dialog", { name: /^Fotos de / })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/hotel/${hotelId}\\?`));
  });
});

test.describe("sem internet (U6)", () => {
  test("o clique não navega: 'Você está sem internet'; com a conexão de volta, abre a foto", async ({
    page,
    context,
  }) => {
    const seeAll = await openHotel(page, 1);
    const before = page.url();
    await context.setOffline(true);
    await seeAll.click();
    const dialog = loadingDialog(page);
    await expect(dialog.getByRole("alert")).toContainText("Você está sem internet");
    await expect(dialog.getByRole("button", { name: "Tentar de novo" })).toBeFocused();
    expect(page.url()).toBe(before);
    await context.setOffline(false);
    await dialog.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByRole("dialog", { name: /^Fotos de / })).toBeVisible();
    await expect(page).toHaveURL(/\/hotel\/1\/photos\/1$/);
  });

  test("Esc fecha o estado offline e devolve o foco ao link", async ({ page, context }) => {
    const seeAll = await openHotel(page, 1);
    const before = page.url();
    await context.setOffline(true);
    await seeAll.click();
    await expect(loadingDialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(seeAll).toBeFocused();
    expect(page.url()).toBe(before);
  });
});

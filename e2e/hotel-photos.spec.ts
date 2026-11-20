import { expect, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { hotelPath, noHorizontalScroll, waitForHydration } from "./helpers/hotel-details";
import { test } from "./helpers/mock-api-server";

const NAME = "Hotel Copacabana Palace";
// 1×1 GIF: o Unsplash não é alcançável em todo ambiente (e os testes não devem depender dele).
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com/, (route) =>
    route.fulfill({ contentType: "image/gif", body: PIXEL }),
  );
});

/** Contador da página cheia, dentro do grupo (a cópia oculta do HTML em streaming não conta). */
const pageCounter = (page: Page, text: string) =>
  page.getByRole("group", { name: `Fotos de ${NAME}` }).getByText(text, { exact: true });

const openDialog = (page: Page) => page.getByRole("dialog", { name: `Fotos de ${NAME}` });

/** Abre a galeria pelo link "Ver todas" (existe no celular e no desktop). */
const openFromSeeAll = async (page: Page) => {
  await page.goto(hotelPath(1));
  await waitForHydration(page);
  const link = page.getByRole("link", { name: "Ver todas as fotos (5)" });
  await link.click();
  await expect(openDialog(page)).toBeVisible();
  return link;
};

test.describe("galeria como rota interceptada (critérios 12 a 15)", () => {
  test("a miniatura abre o modal sobre a página, na URL da foto, sem rolar", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "as miniaturas só existem a partir de sm");
    await page.goto(hotelPath(1));
    await waitForHydration(page);
    const before = await page.evaluate(() => window.scrollY);
    await page.getByRole("link", { name: "Abrir foto 3 de 5" }).click();
    const dialog = openDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Foto 3 de 5")).toBeVisible();
    await expect(page).toHaveURL(/\/hotel\/1\/photos\/3$/);
    await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeAttached();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test("setas dão a volta sem nenhum request de navegação; a URL acompanha", async ({ page }) => {
    await openFromSeeAll(page);
    const dialog = openDialog(page);
    await expect(dialog.getByText("Foto 1 de 5")).toBeVisible();
    const navigations: string[] = [];
    page.on("request", (request) => {
      const headers = request.headers();
      if (request.url().includes("_rsc") || headers.rsc || headers["next-router-state-tree"]) {
        navigations.push(request.url());
      }
    });
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText("Foto 4 de 5")).toBeVisible();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText("Foto 1 de 5")).toBeVisible();
    await expect(page).toHaveURL(/\/hotel\/1\/photos\/1$/);
    expect(navigations).toEqual([]);
  });

  test("Esc e 'Fechar' voltam à URL anterior (com critérios) e devolvem o foco ao link", async ({
    page,
  }) => {
    const link = await openFromSeeAll(page);
    const origin = hotelPath(1);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(openDialog(page)).toBeHidden();
    await expect.poll(() => new URL(page.url()).search).toBe(new URL(origin, page.url()).search);
    await expect(link).toBeFocused();

    await link.click();
    await expect(openDialog(page)).toBeVisible();
    await openDialog(page).getByRole("button", { name: "Fechar" }).click();
    await expect(openDialog(page)).toBeHidden();
    await expect(link).toBeFocused();
  });

  test("Esc duas vezes seguidas volta uma única entrada", async ({ page }) => {
    await openFromSeeAll(page);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(openDialog(page)).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
    await expect(page).toHaveURL(/\/hotel\/1\?/);
  });

  test("Voltar do navegador fecha o modal, devolve o foco; Avançar reabre", async ({ page }) => {
    const link = await openFromSeeAll(page);
    await page.goBack();
    await expect(openDialog(page)).toBeHidden();
    await expect(page).toHaveURL(/\/hotel\/1\?/);
    await expect(link).toBeFocused();
    await page.goForward();
    await expect(openDialog(page)).toBeVisible();
    await expect(page).toHaveURL(/\/hotel\/1\/photos\/1$/);
  });
});

test.describe("página cheia da foto (critérios 16, 17 e 19)", () => {
  test("URL direta: h1, foto, controles que trocam sem modal e título da aba", async ({ page }) => {
    await page.goto("/hotel/1/photos/3");
    await expect(page.getByRole("heading", { level: 1, name: `Fotos de ${NAME}` })).toBeVisible();
    await expect(pageCounter(page, "Foto 3 de 5")).toBeVisible();
    await expect(page).toHaveTitle(`Foto 3 de 5 · ${NAME} | Infotera Hotéis`);
    await page.getByRole("button", { name: "Próxima foto" }).click();
    await expect(pageCounter(page, "Foto 4 de 5")).toBeVisible();
    await expect(page).toHaveURL(/\/hotel\/1\/photos\/4$/);
    await expect(page).toHaveTitle(`Foto 4 de 5 · ${NAME} | Infotera Hotéis`);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("link", { name: "Voltar para o hotel" }).click();
    await expect(page).toHaveURL(/\/hotel\/1$/);
  });

  test("reload na foto aberta pelo modal mostra a página cheia", async ({ page }) => {
    await openFromSeeAll(page);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: `Fotos de ${NAME}` })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("em /en as URLs e os textos ficam em inglês", async ({ page }) => {
    await page.goto("/en/hotel/1/photos/3");
    await expect(page.getByRole("heading", { level: 1, name: `Photos of ${NAME}` })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to hotel" })).toHaveAttribute(
      "href",
      "/en/hotel/1",
    );
    await expect(page).toHaveTitle(`Photo 3 of 5 · ${NAME} | Infotera Hotéis`);
  });

  for (const path of ["/hotel/6/photos/3", "/hotel/1/photos/0", "/hotel/1/photos/abc"]) {
    test(`${path}: 'Foto não encontrada' com link para o hotel`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Foto não encontrada" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Ver o hotel" })).toBeVisible();
    });
  }
});

test.describe("acessibilidade e 320 px (critérios 27 e 28)", () => {
  test("axe no modal aberto e na página cheia; sem scroll horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openFromSeeAll(page);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.goto("/hotel/1/photos/2");
    await expect(pageCounter(page, "Foto 2 de 5")).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

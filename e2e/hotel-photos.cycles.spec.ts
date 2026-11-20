import { expect, type Page } from "@playwright/test";
import { hotelPath, waitForHydration } from "./helpers/hotel-details";
import { test } from "./helpers/mock-api-server";

const NAME = "Hotel Copacabana Palace";
const CYCLES = 5;
// 1×1 GIF: o Unsplash não é alcançável em todo ambiente.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com/, (route) =>
    route.fulfill({ contentType: "image/gif", body: PIXEL }),
  );
});

const dialog = (page: Page) => page.getByRole("dialog", { name: `Fotos de ${NAME}` });

/** O `<dialog>` só é modal de verdade se casa `:modal` (fundo inerte, Esc nativo). */
const isModal = (page: Page) =>
  dialog(page).evaluate(
    (element) => element instanceof HTMLDialogElement && element.matches(":modal"),
  );

const expectOpenModal = async (page: Page, counter: string) => {
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByText(counter)).toBeVisible();
  expect(await isModal(page)).toBe(true);
};

/** Contador do visualizador da página cheia (o grupo evita casar com a cópia ainda oculta do HTML em streaming). */
const counter = (page: Page, text: string) =>
  page.getByRole("group", { name: `Fotos de ${NAME}` }).getByText(text, { exact: true });

/** Alterna os gatilhos: "Ver todas" (ciclos ímpares) e a foto principal (pares); as duas abrem a foto 1. */
const openAll = async (page: Page, cycle = 1) => {
  const link =
    cycle % 2 === 1
      ? page.getByRole("link", { name: "Ver todas as fotos (5)" })
      : page.getByRole("link", { name: "Abrir foto 1 de 5" }).first();
  await link.click();
  return link;
};

type Closer = { name: string; close: (page: Page) => Promise<void> };

const CLOSERS: Closer[] = [
  { name: "Esc", close: (page) => page.keyboard.press("Escape") },
  {
    name: "botão Fechar",
    close: (page) => dialog(page).getByRole("button", { name: "Fechar" }).click(),
  },
  { name: "Voltar do navegador", close: async (page) => void (await page.goBack()) },
];

test.describe("modal da foto: ciclos de abrir e fechar (critérios 14 e 15)", () => {
  for (const closer of CLOSERS) {
    test(`${CYCLES} ciclos fechando por ${closer.name}: sempre modal, Esc fecha, contador certo`, async ({
      page,
    }) => {
      await page.goto(hotelPath(1));
      await waitForHydration(page);
      for (let cycle = 1; cycle <= CYCLES; cycle += 1) {
        const link = await openAll(page, cycle);
        await expectOpenModal(page, "Foto 1 de 5");
        await expect(page).toHaveURL(/\/hotel\/1\/photos\/1$/);
        await closer.close(page);
        await expect(dialog(page)).toBeHidden();
        await expect(page).toHaveURL(/\/hotel\/1\?/);
        await expect(link).toBeFocused();
      }
    });
  }

  test("Voltar e Avançar repetidos: o modal reaberto é modal, o Esc fecha e o contador bate com a URL", async ({
    page,
  }) => {
    await page.goto(hotelPath(1));
    await waitForHydration(page);
    await openAll(page);
    await expectOpenModal(page, "Foto 1 de 5");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expectOpenModal(page, "Foto 3 de 5");
    for (let cycle = 0; cycle < CYCLES; cycle += 1) {
      await page.goBack();
      await expect(dialog(page)).toBeHidden();
      await expect(page).toHaveURL(/\/hotel\/1\?/);
      await page.goForward();
      await expect(page).toHaveURL(/\/hotel\/1\/photos\/3$/);
      await expectOpenModal(page, "Foto 3 de 5");
    }
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(/\/hotel\/1\?/);
  });

  test("página cheia: Próxima, Voltar para o hotel e Voltar do navegador mostram a foto da URL", async ({
    page,
  }) => {
    await page.goto("/hotel/1/photos/3");
    await expect(counter(page, "Foto 3 de 5")).toBeVisible();
    await page.getByRole("button", { name: "Próxima foto" }).click();
    await expect(counter(page, "Foto 4 de 5")).toBeVisible();
    await page.getByRole("link", { name: "Voltar para o hotel" }).click();
    await expect(page).toHaveURL(/\/hotel\/1$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/hotel\/1\/photos\/4$/);
    await expect(counter(page, "Foto 4 de 5")).toBeVisible();
    await expect(page).toHaveTitle(`Foto 4 de 5 · ${NAME} | Infotera Hotéis`);
  });
});

import { expect, test } from "@playwright/test";
import {
  API_URL,
  CHECK_IN,
  CHECK_OUT,
  cardByName,
  cards,
  countHeading,
  criteriaQuery,
  hotelName,
  searchPath,
} from "./helpers/hotel-search";

// Mock-api real em :3333 (subida pelo webServer). Ids estáveis do seed (Rio de Janeiro, RJ):
// 17 mais popular · 13 (R$ 180) · 19 esgotado · 7 com 1 quarto · 14 hotéis no total.

test.describe("lista e cards", () => {
  test("Rio em modo estadia: 10 cards por popularidade, total, selos e link do card", async ({
    page,
    request,
  }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expect(cards(page).first()).toContainText("Pousada Vista Corcovado");
    await expect(countHeading(page)).toContainText("14 hotéis encontrados");
    await expect(page.getByText("Mostrando 1–10 de 14")).toBeVisible();

    const card13 = cardByName(page, await hotelName(request, 13));
    await expect(card13).toContainText("R$ 540,00");
    await expect(card13).toContainText("total · 3 noites · 1 quarto");
    await expect(card13).toContainText("a partir de R$ 180 por noite");
    await expect(card13.getByRole("link")).toHaveAttribute("href", `/hotel/13?${criteriaQuery()}`);

    const card19 = cardByName(page, await hotelName(request, 19));
    await expect(card19).toContainText("Esgotado");
    await expect(card19).toContainText("Sem quartos disponíveis para estas datas.");
    await expect(card19).not.toContainText("total ·");
    await expect(cardByName(page, await hotelName(request, 7))).toContainText("Apenas 1 quarto!");
  });

  test("o skeleton aparece primeiro e a lista chega", async ({ page }) => {
    await page.route("**/hotels?**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });
    await page.goto(searchPath());
    await expect(page.locator("ul[aria-busy='true']").first()).toBeVisible();
    await expect(cards(page)).toHaveCount(10);
    await expect(page.locator("ul[aria-busy='true']")).toHaveCount(0);
  });
});

test.describe("paginação", () => {
  test("Próxima leva à página 2, foca a contagem sem ficar sob o header e Voltar retorna", async ({
    page,
  }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await page.getByRole("link", { name: "Próxima" }).click();
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(cards(page)).toHaveCount(4);
    await expect(countHeading(page)).toBeFocused();
    await expect(countHeading(page)).toContainText("página 2 de 2");
    const box = await countHeading(page).boundingBox();
    expect(box?.y ?? 0).toBeGreaterThanOrEqual(56);

    await page.goBack();
    await expect(page).not.toHaveURL(/page=2/);
    await expect(cards(page)).toHaveCount(10);
  });

  test("page=5 volta para a última página sem nova entrada no histórico", async ({ page }) => {
    await page.goto(searchPath("page=5"));
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(cards(page)).toHaveCount(4);
  });
});

test.describe("ordenação e URL compartilhável", () => {
  test("Menor preço põe o hotel 13 primeiro e Maior avaliação o 17", async ({ page, request }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await page.getByLabel("Ordenar por").selectOption({ label: "Menor preço" });
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(cards(page).first()).toContainText(await hotelName(request, 13));
    await page.getByLabel("Ordenar por").selectOption({ label: "Maior avaliação" });
    await expect(page).toHaveURL(/sort=rating-desc/);
    await expect(cards(page).first()).toContainText(await hotelName(request, 17));
  });

  test("recarregar restaura ordenação, filtro e lista", async ({ page, request }) => {
    await page.goto(searchPath("amenity=pool&amenity=spa&sort=price-asc"));
    await expect(cards(page)).toHaveCount(4);
    await expect(cards(page).first()).toContainText(await hotelName(request, 9));
    await page.reload();
    await expect(cards(page)).toHaveCount(4);
    await expect(page.getByLabel("Ordenar por")).toHaveValue("price-asc");
  });

  test("Copiar link copia a URL atual e outra aba abre a mesma lista", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(searchPath("amenity=pool&amenity=spa&sort=price-asc"));
    await expect(cards(page)).toHaveCount(4);
    await page.getByRole("button", { name: "Copiar link" }).click();
    await expect(page.getByText("Link copiado.")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(page.url());

    const other = await context.newPage();
    await other.goto(copied);
    await expect(cards(other)).toHaveCount(4);
    await expect(other.getByLabel("Ordenar por")).toHaveValue("price-asc");
  });
});

test.describe("filtros na barra lateral", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "no celular os filtros ficam no sheet (hotel-search.mobile.spec.ts)");
  });

  test("Piscina + Spa mostram 4 hotéis, gravam amenity e mantêm o foco no checkbox", async ({
    page,
  }) => {
    await page.goto(searchPath("page=1"));
    await expect(cards(page)).toHaveCount(10);
    await page.getByRole("checkbox", { name: "Piscina" }).check();
    await page.getByRole("checkbox", { name: "Spa" }).check();
    await expect(cards(page)).toHaveCount(4);
    await expect(page).toHaveURL(/amenity=pool&amenity=spa/);
    await expect(page.getByRole("checkbox", { name: "Spa" })).toBeFocused();
    await expect(countHeading(page)).toHaveText("4 hotéis encontrados");
  });

  test("tipos (OU) e nota mínima", async ({ page }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await page.getByRole("checkbox", { name: "Pousada" }).check();
    await expect(cards(page)).toHaveCount(4);
    await page.getByRole("checkbox", { name: "Resort" }).check();
    await expect(cards(page)).toHaveCount(5);
    await page.getByRole("checkbox", { name: "Pousada" }).uncheck();
    await page.getByRole("checkbox", { name: "Resort" }).uncheck();
    await page.getByRole("radio", { name: /4,5 ou mais/ }).check();
    await expect(cards(page)).toHaveCount(5);
    await expect(page).toHaveURL(/minRating=4\.5/);
  });

  test("slider do máximo pelo teclado grava maxPrice uma vez, 400 ms depois do último movimento", async ({
    page,
  }) => {
    const priceRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("pricePerNight_lte=")) priceRequests.push(request.url());
    });
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    const max = page.getByLabel("Máximo");
    await max.focus();
    await expect(max).toHaveAttribute("aria-valuetext", /R\$\s3\.000 ou mais/);
    await page.keyboard.press("End");
    for (let step = 0; step < 50; step += 1) await page.keyboard.press("ArrowLeft");
    await expect(max).toHaveAttribute("aria-valuetext", /R\$\s500$/);
    await expect(cards(page)).toHaveCount(3);
    await expect(page).toHaveURL(/maxPrice=500/);
    expect(priceRequests).toHaveLength(1);
    expect(priceRequests[0]).toContain("pricePerNight_lte=500");
    await expect(max).toBeFocused();
  });

  test("o mínimo não passa do máximo", async ({ page }) => {
    await page.goto(searchPath("maxPrice=500"));
    const min = page.getByLabel("Mínimo");
    await min.focus();
    await page.keyboard.press("End");
    await expect(min).toHaveValue("500");
  });

  test("Limpar filtros zera tudo e mantém a ordenação", async ({ page }) => {
    await page.goto(searchPath("amenity=pool&type=hotel&minRating=4&sort=price-asc"));
    await expect(cards(page).first()).toBeVisible();
    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page).not.toHaveURL(/amenity|type=|minRating/);
    await expect(cards(page)).toHaveCount(10);
    await expect(page.getByRole("checkbox", { name: "Piscina" })).not.toBeChecked();
  });
});

test.describe("prefetch do detalhe", () => {
  test("mouse sobre o card prefetcha o hotel e os quartos", async ({ page, isMobile }) => {
    test.skip(isMobile, "toque não prefetcha (o pointerdown vem colado no clique)");
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    const hotel = page.waitForRequest(`${API_URL}/hotels/13`);
    const rooms = page.waitForRequest(`${API_URL}/rooms?hotelId=13`);
    await cards(page).nth(6).hover();
    await hotel;
    await rooms;
  });
});

test.describe("Alterar busca", () => {
  test("novas datas navegam para a URL sem filtros, fecham o painel e focam o h1", async ({
    page,
  }) => {
    await page.goto(searchPath("amenity=pool&sort=price-asc"));
    await expect(cards(page).first()).toBeVisible();
    await page.getByRole("button", { name: "Alterar busca" }).click();
    await expect(page.getByRole("combobox", { name: /Destino/ })).toHaveValue("Rio de Janeiro, RJ");
    await expect(page.getByLabel(/Check-in/)).toHaveValue(CHECK_IN);
    const newIn = CHECK_OUT;
    const newOut = new Date(`${CHECK_OUT}T12:00:00`);
    newOut.setDate(newOut.getDate() + 2);
    const newOutISO = newOut.toISOString().slice(0, 10);
    await page.getByLabel(/Check-in/).fill(newIn);
    await page.getByLabel(/Check-out/).fill(newOutISO);
    await page.getByRole("button", { name: "Buscar hotéis" }).click();
    await expect(page).toHaveURL(new RegExp(`checkIn=${newIn}&checkOut=${newOutISO}`));
    await expect(page).not.toHaveURL(/amenity|sort/);
    await expect(page.getByRole("button", { name: "Alterar busca" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(cards(page)).toHaveCount(10);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(page.getByText(/^\d+–\d+ \w+ · 2 noites · 2 adultos/)).toBeVisible();
  });
});

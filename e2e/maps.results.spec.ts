import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { analyzeAccessibility } from "./helpers/axe";
import { noHorizontalScroll } from "./helpers/hotel-details";
import { API_URL, cardByName, cards, hotelName, searchPath } from "./helpers/hotel-search";

const mapButton = (page: Page) => page.getByRole("button", { name: /^(Mostrar|Ocultar) mapa$/ });
const markers = (page: Page) => page.locator(".leaflet-marker-icon");
/** O invólucro do marcador tem tamanho zero (é só o foco e os atributos): a pílula é o que se vê e clica. */
const marker = (page: Page, id: number) =>
  page.locator(`.leaflet-marker-icon[data-marker-id="${id}"]`);
const pill = (page: Page, id: number) => marker(page, id).locator("span");
const MAP = ".leaflet-container";

/** Abre a busca do Rio com o mapa aberto e espera os marcadores. */
const openResultsMap = async (page: Page, extra = ""): Promise<void> => {
  await page.goto(searchPath(`map=1${extra ? `&${extra}` : ""}`));
  await expect(cards(page).first()).toBeVisible();
  await expect(markers(page).first().locator("span")).toBeVisible();
};

test.beforeEach(({ isMobile }, testInfo) => {
  test.skip(isMobile && !testInfo.title.includes("320"), "o fluxo do mapa roda no desktop");
});

test.describe("mapa dos resultados", () => {
  test("Mostrar mapa grava map=1 sem nova entrada no histórico e mostra um marcador por hotel", async ({
    page,
  }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expect(mapButton(page)).toHaveAttribute("aria-pressed", "false");
    const before = await page.evaluate(() => history.length);
    await mapButton(page).click();
    await expect(page).toHaveURL(/[?&]map=1/);
    expect(await page.evaluate(() => history.length)).toBe(before);
    await expect(mapButton(page)).toHaveAttribute("aria-pressed", "true");
    await expect(mapButton(page)).toHaveText("Ocultar mapa");
    await expect(page.locator(MAP)).toBeVisible();
    await expect(markers(page)).toHaveCount(10);
    await expect(cards(page)).toHaveCount(10);
    // Painel acima da lista, na coluna de resultados.
    const mapBox = await page.locator(MAP).boundingBox();
    const cardBox = await cards(page).first().boundingBox();
    expect((mapBox?.y ?? 0) + (mapBox?.height ?? 0)).toBeLessThanOrEqual(cardBox?.y ?? 0);
    await mapButton(page).click();
    await expect(page).not.toHaveURL(/map=1/);
    await expect(page.locator(MAP)).toHaveCount(0);
  });

  test("filtro, página e limpar: os marcadores seguem os hotéis exibidos e o mapa continua aberto", async ({
    page,
  }) => {
    await openResultsMap(page);
    await expect(markers(page)).toHaveCount(10);
    await page.getByRole("link", { name: "Próxima" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/map=1/);
    await expect(cards(page)).toHaveCount(4);
    await expect(markers(page)).toHaveCount(4);

    await page.goto(searchPath("map=1&amenity=pool"));
    await expect(cards(page).first()).toBeVisible();
    const filtered = await cards(page).count();
    await expect(markers(page)).toHaveCount(filtered);
    await page.getByRole("button", { name: "Limpar filtros" }).first().click();
    await expect(page).toHaveURL(/map=1/);
    await expect(page).not.toHaveURL(/amenity=/);
    await expect(markers(page)).toHaveCount(10);
  });

  test("hover no card destaca o marcador e passar o mouse no marcador destaca o card", async ({
    page,
    request,
  }) => {
    await openResultsMap(page);
    const name = await hotelName(request, 13);
    const card = cardByName(page, name);
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await expect(marker(page, 13)).toHaveAttribute("data-active", "true");
    await expect(markers(page).and(page.locator('[data-active="true"]'))).toHaveCount(1);
    await page.mouse.move(0, 0);
    await expect(marker(page, 13)).toHaveAttribute("data-active", "false");

    await page.locator(MAP).scrollIntoViewIfNeeded();
    await pill(page, 13).hover();
    await expect(card).toHaveClass(/ring-primary/);
  });

  test("marcador: popup com nome, nota, preço, Ver hotel (com critérios) e Mostrar na lista (foca o link do card)", async ({
    page,
    request,
  }) => {
    await openResultsMap(page);
    const name = await hotelName(request, 13);
    await page.locator(MAP).scrollIntoViewIfNeeded();
    await pill(page, 13).click();
    const popup = page.locator(".leaflet-popup");
    await expect(popup).toContainText(name);
    await expect(popup.getByText(/por noite/)).toBeVisible();
    await expect(popup.getByRole("link", { name: "Ver hotel" })).toHaveAttribute(
      "href",
      /^\/hotel\/13\?destination=/,
    );
    await popup.getByRole("button", { name: "Mostrar na lista" }).click();
    await expect(cardByName(page, name).getByRole("link", { name, exact: true })).toBeFocused();
    await expect(popup).toHaveCount(0);
  });

  test("o hotel esgotado tem marcador 'Esgotado' com nome acessível próprio", async ({
    page,
    request,
  }) => {
    await openResultsMap(page);
    const name = await hotelName(request, 19);
    await expect(marker(page, 19)).toHaveText("Esgotado");
    await expect(marker(page, 19)).toHaveAttribute("aria-label", `${name}, esgotado`);
  });

  test("teclado: botão do mapa → Pular o mapa → mapa → marcadores na ordem da lista → lista", async ({
    page,
  }) => {
    await openResultsMap(page);
    await mapButton(page).focus();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular o mapa" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator(MAP)).toBeFocused();
    // No DOM do Leaflet os marcadores vêm antes dos controles de zoom.
    const order: string[] = [];
    for (let index = 0; index < 10; index += 1) {
      await page.keyboard.press("Tab");
      order.push((await page.locator(":focus").getAttribute("data-marker-id")) ?? "");
    }
    const listed = await cards(page).evaluateAll((nodes) =>
      nodes.map((node) =>
        node.querySelector("a[data-hotel-link]")?.getAttribute("data-hotel-link"),
      ),
    );
    expect(order).toEqual(listed);
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAccessibleName("Ampliar o mapa");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAccessibleName("Reduzir o mapa");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAccessibleName("© colaboradores do OpenStreetMap");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAttribute("data-hotel-link", /\d+/);
  });

  test("Pular o mapa leva o foco ao início da lista", async ({ page }) => {
    await openResultsMap(page);
    await mapButton(page).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.locator(":focus")).toHaveAttribute("data-hotel-link", /\d+/);
    const first = await cards(page)
      .first()
      .evaluate((node) =>
        node.querySelector("a[data-hotel-link]")?.getAttribute("data-hotel-link"),
      );
    await expect(page.locator(":focus")).toHaveAttribute("data-hotel-link", first ?? "");
  });
});

test.describe("estados do painel", () => {
  test("carregando o chunk mostra skeleton e anúncio; liberar mostra o mapa", async ({ page }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    // Só o que for pedido a partir daqui (o chunk do Leaflet) fica retido no portão.
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/_next\/static\//, async (route) => {
      await gate;
      await route.continue();
    });
    await mapButton(page).click();
    await expect(page.getByRole("status").filter({ hasText: "Carregando mapa…" })).toBeAttached();
    await expect(page.locator(MAP)).toHaveCount(0);
    release();
    await expect(markers(page).first().locator("span")).toBeVisible();
  });

  test("falha do chunk mostra o alerta e 'Tentar de novo' pede o chunk de novo", async ({
    page,
  }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    let failing = true;
    await page.route(/\/_next\/static\//, async (route) => {
      if (failing) return route.abort();
      return route.continue();
    });
    await mapButton(page).click();
    const alert = page.getByRole("alert").filter({ hasText: "Não foi possível carregar o mapa." });
    // O runtime do Next tenta o chunk mais uma vez antes de rejeitar.
    await expect(alert).toBeVisible({ timeout: 15_000 });
    failing = false;
    await alert.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(markers(page).first().locator("span")).toBeVisible();
    await expect(alert).toHaveCount(0);
    // O botão de retry sumiu com o alerta: o foco vai para o mapa, não para o body.
    await expect(page.locator(MAP)).toBeFocused();
  });

  test("lista com erro: o painel some e o botão continua pressionado", async ({ page }) => {
    await page.route(`${API_URL}/hotels?**`, (route) => route.abort());
    await page.goto(searchPath("map=1"));
    await expect(page.getByRole("button", { name: "Tentar de novo" }).first()).toBeVisible();
    await expect(mapButton(page)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(MAP)).toHaveCount(0);
  });

  test("estado vazio: sem painel, botão pressionado", async ({ page }) => {
    await page.goto(searchPath("map=1&minPrice=2950&amenity=spa&type=pousada"));
    await expect(page.getByText("Nenhum hotel encontrado").first()).toBeVisible();
    await expect(mapButton(page)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(MAP)).toHaveCount(0);
  });

  test("offline com o mapa aberto: aviso e a lista segue disponível", async ({ page, context }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await context.setOffline(true);
    await mapButton(page).click();
    await expect(
      page.getByText("O mapa precisa de internet. A lista continua disponível."),
    ).toBeVisible();
    await expect(cards(page)).toHaveCount(10);
    await context.setOffline(false);
  });
});

test.describe("mapa dos resultados: layout e movimento", () => {
  test("sem violações de acessibilidade com o mapa aberto", async ({ page }) => {
    await openResultsMap(page);
    const results = await analyzeAccessibility(page);
    expect(results.violations).toEqual([]);
  });

  test("em 320 px o painel cabe, os marcadores têm alvo de 24 px e o popup cabe na tela", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openResultsMap(page);
    expect(await noHorizontalScroll(page)).toBe(true);
    const panel = await page.locator(MAP).boundingBox();
    expect(panel?.width ?? 999).toBeLessThanOrEqual(320);
    const box = await pill(page, 17).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(24);
    await page.locator(MAP).scrollIntoViewIfNeeded();
    await pill(page, 17).dispatchEvent("click");
    // O Leaflet desloca o mapa (autoPan) para o popup caber: espera ele assentar.
    const popup = page.locator(".leaflet-popup-content-wrapper");
    await expect
      .poll(async () => {
        const box = await popup.boundingBox();
        return box ? box.x >= 0 && box.x + box.width <= 320 : false;
      })
      .toBe(true);
  });

  test("prefers-reduced-motion desliga as animações do mapa; sem a preferência elas existem", async ({
    page,
  }) => {
    await openResultsMap(page);
    await expect(page.locator(MAP)).not.toHaveClass(/leaflet-fade-anim|leaflet-zoom-anim/);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(searchPath("map=1"));
    await expect(markers(page).first().locator("span")).toBeVisible();
    await expect(page.locator(MAP)).toHaveClass(/leaflet-fade-anim/);
  });
});

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { analyzeAccessibility } from "./helpers/axe";
import { noHorizontalScroll } from "./helpers/hotel-details";
import { API_URL, cardByName, cards, hotelName, searchPath } from "./helpers/hotel-search";

const mapButton = (page: Page) => page.getByRole("button", { name: "Mapa", exact: true });
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
  test("ligar o mapa grava map=1 sem nova entrada no histórico e mostra um marcador por hotel", async ({
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
    await expect(mapButton(page)).toHaveText("Mapa");
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
    const skip = page.getByRole("button", { name: "Pular o mapa" });
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

/** O popup aberto no marcador `index` (ordem da lista), pelo teclado. */
const openPopupByKeyboard = async (page: Page, index: number, key = "Enter") => {
  const target = markers(page).nth(index);
  await target.focus();
  await page.keyboard.press(key);
  const popup = page.locator(".leaflet-popup");
  await expect(popup.getByRole("link", { name: "Ver hotel" })).toBeFocused();
  return { popup, target };
};

test.describe("popup: teclado", () => {
  test("o botão do mapa tem rótulo fixo 'Mapa' e só o aria-pressed muda", async ({ page }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expect(mapButton(page)).toHaveAccessibleName("Mapa");
    await expect(mapButton(page)).toHaveAttribute("aria-pressed", "false");
    await expect(mapButton(page)).not.toHaveAttribute("aria-controls");
    await mapButton(page).click();
    await expect(mapButton(page)).toHaveAccessibleName("Mapa");
    await expect(mapButton(page)).toHaveAttribute("aria-pressed", "true");
    await expect(mapButton(page)).toHaveAttribute("aria-controls", /.+/);
  });

  test("Enter abre com o foco em 'Ver hotel'; Tab percorre Mostrar na lista e Fechar; no último, fecha e foca o próximo marcador", async ({
    page,
  }) => {
    await openResultsMap(page);
    const { popup, target } = await openPopupByKeyboard(page, 0);
    await expect(target).toHaveAttribute("aria-expanded", "true");
    await expect(popup.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(popup.getByRole("button", { name: "Mostrar na lista" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(popup.getByRole("button", { name: "Fechar" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(popup).toHaveCount(0);
    await expect(markers(page).nth(1)).toBeFocused();
  });

  test("Shift+Tab no primeiro, Esc e o × voltam ao marcador; Espaço abre como o Enter e reabrir foca o popup de novo", async ({
    page,
  }) => {
    await openResultsMap(page);
    let { popup, target } = await openPopupByKeyboard(page, 2, "Space");
    await page.keyboard.press("Shift+Tab");
    await expect(popup).toHaveCount(0);
    await expect(target).toBeFocused();

    ({ popup, target } = await openPopupByKeyboard(page, 2));
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(target).toBeFocused();

    ({ popup, target } = await openPopupByKeyboard(page, 2));
    await popup.getByRole("button", { name: "Fechar" }).click();
    await expect(popup).toHaveCount(0);
    await expect(target).toBeFocused();
  });

  test("Tab no último marcador abre e fecha de volta ao próprio marcador", async ({ page }) => {
    await openResultsMap(page);
    const last = (await markers(page).count()) - 1;
    const { popup, target } = await openPopupByKeyboard(page, last);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(popup).toHaveCount(0);
    await expect(target).toBeFocused();
  });

  test("o popup tem × de 44 px, nota com estrelas, e nenhuma margem de parágrafo", async ({
    page,
  }) => {
    await openResultsMap(page);
    const { popup } = await openPopupByKeyboard(page, 0);
    const close = popup.getByRole("button", { name: "Fechar" });
    expect((await close.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expect(popup.getByText(/^Nota/)).toBeAttached();
    const margins = await popup
      .locator("p")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).marginTop));
    expect(margins.every((margin) => margin === "0px")).toBe(true);
    expect((await popup.locator(".leaflet-popup-close-button").count()) === 0).toBe(true);
  });

  test("a dica fica abaixo da moldura e só aparece com foco de teclado; 'Pular o mapa' aparece sobre o canto do mapa", async ({
    page,
  }) => {
    await openResultsMap(page);
    const hint = page.locator(`[id="${await page.locator(MAP).getAttribute("aria-describedby")}"]`);
    await expect(hint).toHaveCSS("opacity", "0");
    await mapButton(page).focus();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("button", { name: "Pular o mapa" });
    await expect(skip).toBeFocused();
    const map = await page.locator(MAP).boundingBox();
    const skipBox = await skip.boundingBox();
    expect(skipBox?.x ?? 0).toBeGreaterThanOrEqual(map?.x ?? 0);
    expect(skipBox?.y ?? 0).toBeGreaterThanOrEqual(map?.y ?? 0);
    expect(skipBox?.y ?? 0).toBeLessThan((map?.y ?? 0) + 24);
    await page.keyboard.press("Tab");
    await expect(page.locator(MAP)).toBeFocused();
    await expect(hint).toHaveCSS("opacity", "1");
    const hintBox = await hint.boundingBox();
    expect(hintBox?.y ?? 0).toBeGreaterThanOrEqual((map?.y ?? 0) + (map?.height ?? 0));
  });

  test("em 320 px o popup dos resultados cabe na moldura e não cobre o zoom", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openResultsMap(page);
    await page.locator(MAP).scrollIntoViewIfNeeded();
    await markers(page).first().focus();
    await page.keyboard.press("Enter");
    const popup = page.locator(".leaflet-popup-content-wrapper");
    await expect(popup).toBeVisible();
    const zoomIn = page.getByRole("button", { name: "Ampliar o mapa" });
    await expect
      .poll(async () => {
        const map = await page.locator(MAP).boundingBox();
        const box = await popup.boundingBox();
        const plus = await zoomIn.boundingBox();
        if (!map || !box || !plus) return false;
        const inside =
          box.x >= map.x &&
          box.x + box.width <= map.x + map.width &&
          box.y >= map.y &&
          box.y + box.height <= map.y + map.height;
        const overlapsZoom =
          box.x < plus.x + plus.width &&
          box.x + box.width > plus.x &&
          box.y < plus.y + plus.height &&
          box.y + box.height > plus.y;
        return inside && !overlapsZoom;
      })
      .toBe(true);
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

  test("falha do chunk mostra o alerta e 'Tentar de novo' recarrega a página com o mapa aberto", async ({
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
    // O painel encolhe para o alerta: sem moldura vazia e com a garantia sobre a lista.
    await expect(alert).toContainText("A lista abaixo continua disponível.");
    await expect(page.locator(MAP)).toHaveCount(0);
    const retry = alert.getByRole("button", { name: "Tentar de novo" });
    expect((await retry.boundingBox())?.width ?? 0).toBeLessThan(400);
    failing = false;
    await alert.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(markers(page).first().locator("span")).toBeVisible();
    await expect(alert).toHaveCount(0);
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
      page.getByText("O mapa precisa de internet. A lista abaixo continua disponível."),
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

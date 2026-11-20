import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { analyzeAccessibility } from "./helpers/axe";
import { hotelPath, noHorizontalScroll } from "./helpers/hotel-details";

const FRAME = "#localizacao .sm\\:aspect-\\[2\\/1\\]";

/** Rola até a moldura e espera o mapa interativo ficar visível (o estático já saiu). */
const openHotelMap = async (page: Page): Promise<void> => {
  await page.locator(FRAME).scrollIntoViewIfNeeded();
  await expect(page.getByRole("region", { name: /^Mapa: / })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Mapa: / })).toHaveCount(0);
  // O marcador só é focável quando deixa de estar `visibility: hidden` (com movimento reduzido a
  // visibilidade do painel de marcadores volta alguns quadros depois do mapa): espera a pílula visível.
  await expect(page.locator(".leaflet-marker-icon > span")).toBeVisible();
  // Tiles todos carregados e sem pan/zoom em curso: o axe mede um mapa parado.
  await expect(page.locator(".leaflet-tile-loading, .leaflet-zoom-anim")).toHaveCount(0);
};

test.describe("mapa do hotel", () => {
  test("sem JavaScript é o mapa estático da F4 (HTML do servidor, sem Leaflet)", async ({
    request,
  }) => {
    const html = await (await request.get(hotelPath(1))).text();
    expect(html).toContain('aria-label="Mapa: ');
    expect(html).toContain("https://tile.openstreetmap.org/15/");
    expect(html).toContain("Abrir no OpenStreetMap");
    expect(html).not.toContain("leaflet-container");
  });

  test("vira interativo só ao chegar perto, no mesmo tamanho (sem salto)", async ({ page }) => {
    // O nome dos chunks muda entre dev e build: identifica o do Leaflet pelo conteúdo ("leaflet-container").
    const inspected: Promise<boolean>[] = [];
    page.on("response", (response) => {
      const type = response.request().resourceType();
      if (
        !response.url().includes("/_next/static/") ||
        (type !== "script" && type !== "stylesheet")
      )
        return;
      inspected.push(
        response.text().then(
          (text) => text.includes("leaflet-container"),
          () => false,
        ),
      );
    });
    const leafletChunksLoaded = async (): Promise<number> =>
      (await Promise.all([...inspected])).filter(Boolean).length;
    await page.goto(hotelPath(1));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".leaflet-container")).toHaveCount(0);
    expect(await leafletChunksLoaded()).toBe(0);

    const frame = page.locator(FRAME);
    const before = await frame.boundingBox();
    await openHotelMap(page);
    await expect(page.locator(".leaflet-tile").first()).toBeVisible();
    expect(await leafletChunksLoaded()).toBeGreaterThan(0);
    const after = await frame.boundingBox();
    expect(after?.height).toBe(before?.height);
    expect(after?.width).toBe(before?.width);
  });

  test("teclado: foco anuncia nome e dica; setas movem; botões e + dão zoom; a roda rola a página", async ({
    page,
  }) => {
    await page.goto(hotelPath(1));
    await openHotelMap(page);
    const map = page.getByRole("region", { name: /^Mapa: / });
    await map.focus();
    await expect(map).toBeFocused();
    const hintId = await map.getAttribute("aria-describedby");
    await expect(page.locator(`[id="${hintId}"]`)).toContainText("Setas movem o mapa");

    const pane = page.locator(".leaflet-map-pane");
    const start = await pane.evaluate((el) => el.style.transform);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => pane.evaluate((el) => el.style.transform)).not.toBe(start);

    const zoom = () => map.getAttribute("data-zoom");
    await expect.poll(zoom).toBe("15");
    await page.getByRole("button", { name: "Ampliar o mapa" }).click();
    await expect.poll(zoom).toBe("16");
    await page.getByRole("button", { name: "Reduzir o mapa" }).click();
    await expect.poll(zoom).toBe("15");
    await map.focus();
    await page.keyboard.press("+");
    await expect.poll(zoom).toBe("16");

    const box = await map.boundingBox();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.move((box?.x ?? 0) + 40, (box?.y ?? 0) + 40);
    await page.mouse.wheel(0, 120);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);
    expect(await zoom()).toBe("16");
  });

  test("Enter no marcador abre o popup com o nome; Esc fecha e o foco volta", async ({ page }) => {
    await page.goto(hotelPath(1));
    await openHotelMap(page);
    const marker = page.locator(".leaflet-marker-icon");
    // O nome acessível é aplicado depois da montagem: sinal de que o marcador já está pronto.
    await expect(marker).toHaveAttribute("aria-label", /Copacabana Palace/);
    await marker.focus();
    await expect(marker).toHaveAttribute("aria-haspopup", "dialog");
    await expect(marker).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Enter");
    const popup = page.locator(".leaflet-popup");
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("Copacabana Palace");
    await expect(marker).toHaveAttribute("aria-expanded", "true");
    // O popup do hotel só tem o nome e o × (nosso, 44 px): o foco entra no ×.
    await expect(popup.getByRole("dialog", { name: /Copacabana Palace/ })).toBeVisible();
    const close = popup.getByRole("button", { name: "Fechar" });
    await expect(close).toBeFocused();
    expect((await close.boundingBox())?.width).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(marker).toBeFocused();
  });

  test("Tab no × do popup fecha e devolve o foco ao próprio marcador; Espaço também abre", async ({
    page,
  }) => {
    await page.goto(hotelPath(1));
    await openHotelMap(page);
    const marker = page.locator(".leaflet-marker-icon");
    await expect(marker).toHaveAttribute("aria-label", /Copacabana Palace/);
    await marker.focus();
    await page.keyboard.press("Space");
    const popup = page.locator(".leaflet-popup");
    await expect(popup.getByRole("button", { name: "Fechar" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(popup).toHaveCount(0);
    await expect(marker).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(popup.getByRole("button", { name: "Fechar" })).toBeFocused();
    await popup.getByRole("button", { name: "Fechar" }).click();
    await expect(marker).toBeFocused();
  });

  test("a dica de teclado fica abaixo da moldura, só aparece com foco de teclado e não cobre o mapa", async ({
    page,
  }) => {
    await page.goto(hotelPath(1));
    await openHotelMap(page);
    const map = page.getByRole("region", { name: /^Mapa: / });
    const hint = page.locator(`[id="${await map.getAttribute("aria-describedby")}"]`);
    await expect(hint).toHaveCSS("opacity", "0");
    await page.mouse.click(5, 5);
    await map.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(map).toBeFocused();
    await expect(hint).toHaveCSS("opacity", "1");
    const frame = await page.locator(FRAME).boundingBox();
    const hintBox = await hint.boundingBox();
    expect(hintBox?.y ?? 0).toBeGreaterThanOrEqual((frame?.y ?? 0) + (frame?.height ?? 0));
  });

  test("a moldura é 2:1 no desktop e 4:3 em 320 px, igual antes e depois do Leaflet", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "o primeiro passo mede a moldura larga (desktop)");
    await page.goto(hotelPath(1));
    const ratio = async (): Promise<number> => {
      const box = await page.locator(FRAME).boundingBox();
      return (box?.width ?? 0) / (box?.height ?? 1);
    };
    await page.locator(FRAME).scrollIntoViewIfNeeded();
    expect(await ratio()).toBeCloseTo(2, 1);
    await page.setViewportSize({ width: 320, height: 700 });
    await openHotelMap(page);
    expect(await ratio()).toBeCloseTo(4 / 3, 1);
  });

  test("em 320 px o popup do hotel cabe na moldura sem cobrir o zoom", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(hotelPath(1));
    await openHotelMap(page);
    const marker = page.locator(".leaflet-marker-icon");
    await expect(marker).toHaveAttribute("aria-label", /Copacabana Palace/);
    await marker.focus();
    await page.keyboard.press("Enter");
    const popup = page.locator(".leaflet-popup-content-wrapper");
    await expect(popup).toBeVisible();
    const frame = (await page.locator(FRAME).boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
    const zoomIn = page.getByRole("button", { name: "Ampliar o mapa" });
    await expect
      .poll(async () => {
        const box = await popup.boundingBox();
        const plus = await zoomIn.boundingBox();
        if (!box || !plus) return false;
        const inside =
          box.x >= frame.x &&
          box.x + box.width <= frame.x + frame.width &&
          box.y >= frame.y &&
          box.y + box.height <= frame.y + frame.height;
        const overlapsZoom =
          box.x < plus.x + plus.width &&
          box.x + box.width > plus.x &&
          box.y < plus.y + plus.height &&
          box.y + box.height > plus.y;
        return inside && !overlapsZoom;
      })
      .toBe(true);
  });

  test("tiles com erro: o estático fica e nenhum erro aparece", async ({ page, tiles }) => {
    tiles.mode = "abort";
    await page.goto(hotelPath(1));
    await page.locator(FRAME).scrollIntoViewIfNeeded();
    await expect.poll(() => tiles.requests.length).toBeGreaterThan(0);
    await expect(page.getByRole("img", { name: /^Mapa: / })).toBeVisible();
    await expect(page.locator(".leaflet-container")).toHaveCount(0);
    await expect(page.getByRole("alert").filter({ hasText: /mapa/i })).toHaveCount(0);
  });

  test("offline: o estático permanece, sem Leaflet nem erro", async ({ page, context }) => {
    await page.goto(hotelPath(1));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await context.setOffline(true);
    await page.locator(FRAME).scrollIntoViewIfNeeded();
    await expect(page.getByRole("img", { name: /^Mapa: / })).toBeVisible();
    await expect(page.locator(".leaflet-container")).toHaveCount(0);
    await context.setOffline(false);
  });

  test("os controles do mapa nunca passam por cima do cabeçalho", async ({ page }) => {
    await page.goto(hotelPath(1));
    await openHotelMap(page);
    // Rola até o mapa ficar parcialmente sob o cabeçalho fixo.
    await page.evaluate(() => {
      const top =
        document.querySelector("#localizacao .sm\\:aspect-\\[2\\/1\\]")?.getBoundingClientRect()
          .top ?? 0;
      window.scrollBy(0, top - 20);
    });
    const topElementIsHeader = await page.evaluate(() => {
      const element = document.elementFromPoint(window.innerWidth / 2, 10);
      return Boolean(element?.closest("header"));
    });
    expect(topElementIsHeader).toBe(true);
  });

  test("sem violações de acessibilidade com o mapa interativo", async ({ page }) => {
    await page.goto(hotelPath(1));
    await openHotelMap(page);
    const results = await analyzeAccessibility(page);
    expect(results.violations).toEqual([]);
  });

  test("em 320 px o mapa cabe sem rolagem horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(hotelPath(1));
    await openHotelMap(page);
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

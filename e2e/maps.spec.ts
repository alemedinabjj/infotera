import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { analyzeAccessibility } from "./helpers/axe";
import { hotelPath, noHorizontalScroll } from "./helpers/hotel-details";

const FRAME = "#localizacao .aspect-\\[2\\/1\\]";

/** Rola até a moldura e espera o mapa interativo ficar visível (o estático já saiu). */
const openHotelMap = async (page: Page): Promise<void> => {
  await page.locator(FRAME).scrollIntoViewIfNeeded();
  await expect(page.getByRole("region", { name: /^Mapa: / })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Mapa: / })).toHaveCount(0);
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
    const leafletChunks: string[] = [];
    page.on("request", (request) => {
      if (/leaflet/i.test(request.url()) && request.url().includes("/_next/")) {
        leafletChunks.push(request.url());
      }
    });
    await page.goto(hotelPath(1));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".leaflet-container")).toHaveCount(0);
    expect(leafletChunks).toEqual([]);

    const frame = page.locator(FRAME);
    const before = await frame.boundingBox();
    await openHotelMap(page);
    await expect(page.locator(".leaflet-tile").first()).toBeVisible();
    expect(leafletChunks.length).toBeGreaterThan(0);
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
    await page.keyboard.press("Enter");
    const popup = page.locator(".leaflet-popup");
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("Copacabana Palace");
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(marker).toBeFocused();
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
        document.querySelector("#localizacao .aspect-\\[2\\/1\\]")?.getBoundingClientRect().top ??
        0;
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

import { expect, type Page, test } from "@playwright/test";
import { FAVORITES_KEY, favoriteEntry, persisted, seedStorage } from "./extras";
import { criteria, fillPersonal, seedSelection } from "./helpers/checkout";
import { hotelName, searchPath } from "./helpers/hotel-search";

// Movimento: reduced motion sem transform animado, CLS < 0,01 sem reduced motion e HTML do servidor
// sem conteúdo invisível. `getAnimations()` enxerga animações CSS e WAAPI (o Motion usa WAAPI).

/** Animações em curso (ou concluídas ainda ligadas ao elemento) que mexem em transform/escala. */
const transformAnimations = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    document.getAnimations().flatMap((animation) => {
      const effect = animation.effect;
      if (!(effect instanceof KeyframeEffect)) return [];
      const moves = effect
        .getKeyframes()
        .some((frame) => ["transform", "translate", "scale"].some((key) => key in frame));
      return moves ? [`${effect.target?.tagName}`] : [];
    }),
  );

/** Registra os `layout-shift` sem entrada recente do usuário desde o início da página. */
const trackLayoutShift = (page: Page) =>
  page.addInitScript(() => {
    const store = { total: 0 };
    Object.assign(window, { __cls: store });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput) store.total += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

const cls = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const holder: unknown = Object.getOwnPropertyDescriptor(window, "__cls")?.value;
    return typeof holder === "object" && holder !== null && "total" in holder
      ? Number(holder.total)
      : -1;
  });

test.describe("prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("favoritar e comparar não produzem transform animado", async ({ page, request }) => {
    const name = await hotelName(request, 1);
    await page.goto(searchPath());
    await page.getByRole("button", { name: `Salvar nos favoritos: ${name}` }).click();
    await page.getByRole("checkbox", { name: `Comparar: ${name}` }).check();
    await expect(page.locator("[data-bottom-bar]")).toBeVisible();
    await expect(page.getByRole("status").getByText("Hotel salvo nos favoritos.")).toBeVisible();
    expect(await transformAnimations(page)).toEqual([]);
  });

  test("dialog dos termos e passo do checkout sem transform animado", async ({ page }) => {
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" })).toBeVisible();
    await fillPersonal(page, { companions: [{ first: "Bruno", last: "Souza" }] });
    await page.getByRole("button", { name: "Continuar para pagamento", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Pagamento" })).toBeVisible();
    expect(await transformAnimations(page)).toEqual([]);
  });

  test.describe("celular", () => {
    test.use({ viewport: { width: 390, height: 800 }, hasTouch: true });

    test("abrir e fechar o sheet de filtros: sem transform animado e o foco volta ao gatilho", async ({
      page,
    }) => {
      await page.goto(searchPath());
      const trigger = page.getByRole("button", { name: /^Filtros/ });
      await trigger.click();
      const sheet = page.getByRole("dialog", { name: "Filtros" });
      await expect(sheet).toBeVisible();
      expect(await transformAnimations(page)).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  });
});

test.describe("sem reduced motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("CLS < 0,01 em /search (carga e troca de página)", async ({ page }) => {
    await trackLayoutShift(page);
    await page.goto(searchPath("view=paged"));
    await expect(page.getByRole("article").first()).toBeVisible();
    const next = page.getByRole("link", { name: /Próxima|2/ }).first();
    if (await next.isVisible()) {
      await next.click();
      await expect(page.getByRole("article").first()).toBeVisible();
    }
    expect(await cls(page)).toBeLessThan(0.01);
  });

  test("CLS < 0,01 em /favorites (carga e remover)", async ({ page, request }) => {
    await trackLayoutShift(page);
    await seedStorage(page, FAVORITES_KEY, persisted([favoriteEntry(1, 1), favoriteEntry(4, 3)]));
    await page.goto("/favorites");
    await expect(page.getByText("2 hotéis salvos")).toBeVisible();
    await page
      .getByRole("button", { name: `Salvar nos favoritos: ${await hotelName(request, 1)}` })
      .click();
    await expect(page.getByText("Removido dos favoritos.")).toBeVisible();
    expect(await cls(page)).toBeLessThan(0.01);
  });

  test("CLS < 0,01 em /my-bookings", async ({ page }) => {
    await trackLayoutShift(page);
    await page.goto("/my-bookings");
    await expect(
      page.getByRole("heading", { name: "Nenhuma reserva neste navegador" }),
    ).toBeVisible();
    expect(await cls(page)).toBeLessThan(0.01);
  });

  test("os cards de favoritos terminam visíveis (fade só de opacidade)", async ({ page }) => {
    await seedStorage(page, FAVORITES_KEY, persisted([favoriteEntry(1, 1)]));
    await page.goto("/favorites");
    const card = page.locator("article").first();
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("opacity", "1");
    expect(await transformAnimations(page)).toEqual([]);
  });
});

test.describe("hidratação", () => {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test.describe(`com reducedMotion=${reducedMotion}`, () => {
      test.use({ reducedMotion });

      test("sem erro de hidratação no console (/, /hotel/1, /search)", async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });
        page.on("pageerror", (error) => errors.push(error.message));
        for (const path of ["/", "/hotel/1", searchPath()]) {
          await page.goto(path);
          await expect(page.getByRole("banner")).toBeVisible();
          await page.getByRole("link", { name: /^Favoritos/ }).waitFor();
        }
        await expect(page.getByRole("article").first()).toBeVisible();
        // Recursos externos (fotos) podem falhar no ambiente: só interessa a hidratação.
        expect(errors.filter((text) => /hydrat|didn't match|did not match/i.test(text))).toEqual(
          [],
        );
      });
    });
  }
});

test.describe("HTML do servidor", () => {
  for (const path of ["/hotel/1", searchPath(), "/favorites", "/compare", "/my-bookings"]) {
    test(`${path.split("?")[0]} não traz conteúdo invisível`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.ok()).toBe(true);
      expect(await response.text()).not.toMatch(/style="[^"]*opacity:\s*0[;"]/);
    });
  }
});

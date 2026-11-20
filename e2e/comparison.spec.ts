import { expect, type Page, test } from "@playwright/test";
import { COMPARISON_KEY, noHorizontalScroll, trayTop } from "./extras";
import { analyzeAccessibility } from "./helpers/axe";
import { cards, searchPath } from "./helpers/hotel-search";

// Comparação contra a mock-api real. Rio de Janeiro tem 14 hotéis; usa os 4 primeiros da lista.

const hotelNames = (page: Page) => page.locator("article h3 a").allInnerTexts();

const compareBox = (page: Page, name: string) =>
  page.getByRole("checkbox", { name: `Comparar: ${name}` });

const tray = (page: Page) => page.locator("[data-bottom-bar]");

/** Abre a busca e marca os `count` primeiros hotéis; devolve os nomes na ordem de inclusão. */
const pickFromSearch = async (page: Page, count: number): Promise<string[]> => {
  await page.goto(searchPath());
  await expect(cards(page).first()).toBeVisible();
  const names = (await hotelNames(page)).slice(0, count);
  for (const name of names) await compareBox(page, name).check();
  return names;
};

test.describe("marcar e limitar", () => {
  test("a bandeja entra com 1 hotel, mostra 'escolha mais 1' e o Comparar aria-disabled anuncia o motivo", async ({
    page,
  }) => {
    const [first] = await pickFromSearch(page, 1);
    await expect(tray(page)).toBeVisible();
    await expect(tray(page).getByText("1 de 3 hotéis · escolha mais 1")).toBeVisible();
    const action = tray(page).getByRole("button", { name: "Comparar" });
    await expect(action).toHaveAttribute("aria-disabled", "true");
    await action.click({ force: true });
    await expect(page.getByText("Escolha pelo menos 2 hotéis para comparar.")).toBeAttached();
    await expect(
      page
        .locator("[aria-live='polite']")
        .filter({ hasText: `${first} entrou na comparação. 1 de 3.` })
        .or(page.getByText("Escolha pelo menos 2 hotéis para comparar."))
        .first(),
    ).toBeAttached();
  });

  test("o 4º hotel não marca, continua focável e mostra o toast com Ver comparação", async ({
    page,
  }) => {
    await pickFromSearch(page, 3);
    const fourth = (await hotelNames(page))[3] ?? "";
    const box = compareBox(page, fourth);
    await expect(box).toHaveAttribute("aria-disabled", "true");
    await expect(box).toHaveAccessibleDescription("Limite de 3 hotéis na comparação.");
    await box.click({ force: true });
    await expect(box).not.toBeChecked();
    await expect(
      page
        .getByRole("status")
        .getByText("Você já está comparando 3 hotéis. Remova um para adicionar outro."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver comparação" })).toBeVisible();
  });

  test("limpar leva o foco ao main, mostra o toast e Desfazer restaura os 3", async ({ page }) => {
    await pickFromSearch(page, 3);
    await tray(page)
      .getByRole("button", { name: /^Limpar/ })
      .filter({ visible: true })
      // No celular o indicador do `next dev` (portal) cobre o canto da bandeja: só existe em dev.
      .dispatchEvent("click");
    await expect(tray(page)).toHaveCount(0);
    await expect(page.getByRole("main")).toBeFocused();
    await page.getByRole("status").getByRole("button", { name: "Desfazer" }).click();
    await expect(tray(page).getByText("3 de 3 hotéis")).toBeVisible();
  });
});

test.describe("/compare", () => {
  test("bandeja leva à tabela com 1 request de hotéis e 1 de quartos, selos e só diferenças", async ({
    page,
  }) => {
    const names = await pickFromSearch(page, 3);
    const requests: string[] = [];
    page.on("requestfinished", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/hotels" && url.search.includes("id=")) requests.push("hotels");
      if (url.pathname === "/rooms" && url.search.includes("hotelId=")) requests.push("rooms");
    });
    await tray(page).getByRole("link", { name: "Comparar 3 hotéis" }).click();
    await expect(page).toHaveURL(/\/compare\?hotel=\d+&hotel=\d+&hotel=\d+(&|$)/);
    const table = page.getByRole("table", {
      name: `Comparação entre ${names[0]}, ${names[1]} e ${names[2]}`,
    });
    await expect(table).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Comparar hotéis" })).toBeFocused();
    expect(requests.filter((kind) => kind === "hotels")).toHaveLength(1);
    expect(requests.filter((kind) => kind === "rooms")).toHaveLength(1);
    await expect(tray(page)).toHaveCount(0);
    await expect(table.getByText("Menor preço")).toHaveCount(1);
    await expect(table.getByRole("rowheader", { name: /^Preço por noite/ })).toBeVisible();

    const rows = await table.getByRole("row").count();
    await page.getByRole("checkbox", { name: "Mostrar só diferenças" }).check();
    expect(await table.getByRole("row").count()).toBeLessThanOrEqual(rows);
    await expect(page.getByText(/^Mostrando \d+ de \d+ linhas\.$/)).toBeAttached();
  });

  test("remover coluna usa replaceState (sem novo item no histórico) e tira da bandeja", async ({
    page,
  }) => {
    const names = await pickFromSearch(page, 3);
    await tray(page).getByRole("link", { name: "Comparar 3 hotéis" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    const before = await page.evaluate(() => history.length);
    await page.getByRole("button", { name: `Remover ${names[1]} da comparação` }).click();
    await expect(page).toHaveURL(/\/compare\?hotel=\d+&hotel=\d+(&|$)/);
    expect(await page.evaluate(() => history.length)).toBe(before);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    const stored = await page.evaluate((key) => localStorage.getItem(key), COMPARISON_KEY);
    expect(stored).not.toContain(names[1]);
  });

  test("link compartilhado abre num contexto sem storage, sem bandeja", async ({
    page,
    browser,
  }) => {
    await pickFromSearch(page, 2);
    await tray(page).getByRole("link", { name: "Comparar 2 hotéis" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    const shared = page.url();
    const other = await browser.newContext({ baseURL: shared });
    const fresh = await other.newPage();
    await fresh.goto(shared);
    await expect(fresh.getByRole("table")).toBeVisible();
    await expect(fresh.locator("[data-bottom-bar]")).toHaveCount(0);
    await other.close();
  });

  test("URL com lixo mostra só os válidos; menos de 2 e vazio têm seus estados", async ({
    page,
  }) => {
    await page.goto("/compare?hotel=abc&hotel=1&hotel=1&hotel=4&hotel=7&hotel=9");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader")).toHaveCount(4);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
    await page.getByRole("checkbox", { name: "Mostrar só diferenças" }).check();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);

    await page.goto("/compare?hotel=1");
    await expect(page.getByText("Escolha pelo menos 2 hotéis para comparar")).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);

    await page.goto("/compare");
    await expect(page.getByRole("heading", { name: "Nenhum hotel para comparar" })).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("erro só em /rooms: um erro único e o retry refaz só /rooms", async ({ page }) => {
    let failRooms = true;
    const counts = { hotels: 0, rooms: 0 };
    await page.route(/\/(hotels|rooms)\?/, (route) => {
      const url = new URL(route.request().url());
      const kind = url.pathname === "/rooms" ? "rooms" : "hotels";
      counts[kind] += 1;
      if (kind === "rooms" && failRooms) url.searchParams.set("_fail", "1");
      return route.continue({ url: url.toString() });
    });
    await page.goto("/compare?hotel=1&hotel=4");
    await expect(page.getByText("Não foi possível carregar a comparação")).toBeVisible();
    const hotelsBefore = counts.hotels;
    failRooms = false;
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    expect(counts.hotels).toBe(hotelsBefore);
  });
});

test.describe("bandeja e rodapé", () => {
  test("ausente em /checkout e /confirmation", async ({ page }) => {
    await pickFromSearch(page, 2);
    await expect(tray(page)).toBeVisible();
    await page.goto("/checkout");
    await expect(tray(page)).toHaveCount(0);
  });

  test("com a bandeja visível: toasts acima dela e Tab nunca deixa o foco coberto", async ({
    page,
  }) => {
    await pickFromSearch(page, 2);
    const top = await trayTop(page);
    expect(top).not.toBeNull();
    const total = (await hotelNames(page)).length;
    await page.locator("main").first().focus();
    for (let press = 0; press < total * 3 + 10; press++) {
      await page.keyboard.press("Tab");
      const box = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active.closest("[data-bottom-bar]") || active.tagName === "NEXTJS-PORTAL") {
          return null;
        }
        const { bottom } = active.getBoundingClientRect();
        return {
          bottom,
          what: `${active.tagName} ${active.getAttribute("aria-label") ?? active.textContent?.slice(0, 40)}`,
        };
      });
      const barTop = await trayTop(page);
      if (box !== null && barTop !== null)
        expect(box.bottom, box.what).toBeLessThanOrEqual(barTop + 1);
    }
  });

  test("clicar com o mouse num Comparar perto do rodapé não rola a página", async ({ page }) => {
    await pickFromSearch(page, 1);
    const names = await hotelNames(page);
    const last = compareBox(page, names.at(-1) ?? "");
    await last.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await last.click();
    await expect(last).toBeChecked();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test("a variável reserva espaço no fim da página", async ({ page }) => {
    await pickFromSearch(page, 1);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.style.getPropertyValue("--bottom-bar-height")),
      )
      .toMatch(/^[1-9]\d*px$/);
  });

  test("a bandeja no /search passa no axe", async ({ page }) => {
    await pickFromSearch(page, 2);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });
});

test.describe("320 px", () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test("bandeja em uma linha, página e tabela sem rolagem horizontal da página", async ({
    page,
  }) => {
    await pickFromSearch(page, 2);
    const box = await tray(page).boundingBox();
    expect(box?.height).toBeLessThan(100);
    expect(await noHorizontalScroll(page)).toBe(true);
    await tray(page).getByRole("link", { name: "Comparar 2 hotéis" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await expect(page.getByRole("region", { name: /Comparação entre/ })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });
});

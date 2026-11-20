import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { acceptTermsViaDialog, clickPrimary, goToReview } from "./helpers/checkout";
import { hotelPath, roomCard } from "./helpers/hotel-details";
import { API_URL, cards, criteriaQuery, searchPath } from "./helpers/hotel-search";

const CACHE_KEY = "infotera:query-cache";
const UUID_PATH =
  /\/confirmation\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const cacheText = (page: Page): Promise<string> =>
  page.evaluate((key) => localStorage.getItem(key) ?? "", CACHE_KEY);

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "o cache offline roda no desktop");
});

test.describe("cache público persistido", () => {
  test("com a API fora do ar a lista volta do cache, sem skeleton e sem pedir de novo", async ({
    page,
    context,
  }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expect.poll(() => cacheText(page)).toContain('"hotels"');

    // Nova aba, mesma origem: lê o cache persistido; a API está fora do ar.
    const second = await context.newPage();
    let listRequests = 0;
    await second.route(`${API_URL}/**`, async (route) => {
      if (route.request().url().includes("/hotels")) listRequests += 1;
      await route.abort();
    });
    await second.goto(searchPath());
    await expect(cards(second)).toHaveCount(10);
    await expect(second.locator("ul[aria-busy='true']")).toHaveCount(0);
    await expect(second.getByText("14 hotéis encontrados").first()).toBeVisible();
    // Dado restaurado ainda está fresco: nenhum request à lista.
    expect(listRequests).toBe(0);
  });

  test("depois do fluxo até a confirmação o storage tem só dado público", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: /Destino/ }).fill("rio");
    await expect(page.getByRole("option").first()).toBeVisible();
    // A gravação é limitada a 1 por segundo: espera a das sugestões antes de sair da página.
    await expect.poll(() => cacheText(page)).toContain('"suggestions"');

    await page.goto(hotelPath(1, false, criteriaQuery().replace("children=0", "children=1")));
    // As avaliações (consulta pública) só entram no cache depois de carregadas.
    await expect(page.getByText("Maria Silva").first()).toBeVisible();
    await expect.poll(() => cacheText(page)).toContain('"reviews"');
    await roomCard(page, "Suíte Deluxe Ocean View")
      .getByRole("button", { name: /^Selecionar quarto/ })
      .click();
    await expect(page).toHaveURL(/\/checkout$/);
    await goToReview(page, {
      companions: [
        { first: "Bruno", last: "Souza" },
        { first: "Clara", last: "Souza", age: "7" },
      ],
    });
    await acceptTermsViaDialog(page);
    await clickPrimary(page, "Confirmar reserva");
    await page.waitForURL(UUID_PATH);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect.poll(() => cacheText(page)).toContain('"reviews"');
    const raw = await cacheText(page);
    for (const root of ["hotels", "rooms", "reviews", "suggestions"]) {
      expect(raw).toContain(`"${root}"`);
    }
    expect(raw).not.toContain('"bookings"');
    for (const personal of [
      "ana@exemplo.com",
      "ANA SOUZA",
      "Bruno",
      "Clara",
      "11987654321",
      "529.982",
      "52998224725",
      "4111",
    ]) {
      expect(raw).not.toContain(personal);
    }
  });

  test.describe("cache inválido é descartado sem erro", () => {
    const seed =
      (value: string) =>
      async ({ page }: { page: Page }) => {
        await page.addInitScript(
          ([key, text]) => {
            if (!sessionStorage.getItem("e2e:cache-seeded")) {
              sessionStorage.setItem("e2e:cache-seeded", "1");
              localStorage.setItem(key ?? "", text ?? "");
            }
          },
          [CACHE_KEY, value],
        );
      };

    const ghost = (overrides: { buster?: string; timestamp?: number }) =>
      JSON.stringify({
        buster: overrides.buster ?? "0.0.0+versao-antiga",
        timestamp: overrides.timestamp ?? Date.now(),
        clientState: {
          mutations: [],
          queries: [
            {
              queryKey: ["hotels", "detail", 1],
              queryHash: '["hotels","detail",1]',
              state: {
                data: { id: 1, name: "HOTEL FANTASMA" },
                dataUpdateCount: 1,
                dataUpdatedAt: Date.now(),
                error: null,
                errorUpdateCount: 0,
                errorUpdatedAt: 0,
                fetchFailureCount: 0,
                fetchFailureReason: null,
                fetchMeta: null,
                isInvalidated: false,
                status: "success",
                fetchStatus: "idle",
              },
            },
          ],
        },
      });

    for (const [title, value] of [
      ["buster de outra versão", ghost({})],
      ["mais de 24 h", ghost({ timestamp: Date.now() - 25 * 60 * 60 * 1000 })],
      ["JSON corrompido", "{isto-nao-e-json"],
    ] as const) {
      test(title, async ({ page }) => {
        await seed(value)({ page });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(searchPath());
        await expect(cards(page)).toHaveCount(10);
        await expect.poll(() => cacheText(page)).toContain('"hotels"');
        expect(await cacheText(page)).not.toContain("HOTEL FANTASMA");
        expect(errors).toEqual([]);
      });
    }
  });
});

test.describe("banner global de conexão", () => {
  const banner = (page: Page) => page.getByRole("status").filter({ hasText: /sem internet/ });

  test("aparece abaixo do cabeçalho em qualquer rota e some, com confirmação, ao voltar", async ({
    page,
    context,
  }) => {
    for (const path of ["/", searchPath(), hotelPath(1)]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await context.setOffline(true);
      await expect(banner(page)).toBeVisible();
      await expect(banner(page)).toHaveCount(1);
      const header = await page.locator("header").first().boundingBox();
      const bar = await banner(page).boundingBox();
      expect(bar?.y).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0) - 1);
      await context.setOffline(false);
      await expect(
        page.getByRole("status").filter({ hasText: "Conexão restabelecida." }),
      ).toBeVisible();
      await expect(
        page.getByRole("status").filter({ hasText: /sem internet|Conexão/ }),
      ).toHaveCount(0);
    }
  });

  test("com o banner visível o foco programático continua abaixo do cabeçalho", async ({
    page,
    context,
  }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await context.setOffline(true);
    await expect(banner(page)).toBeVisible();
    // Rola para baixo e usa o atalho do teclado: o foco programático no título tem de ficar abaixo do cabeçalho.
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.getByRole("link", { name: "Pular para os resultados" }).focus();
    await page.keyboard.press("Enter");
    const heading = page.getByRole("heading", { level: 2, name: /encontrados/ });
    await expect(heading).toBeFocused();
    const headerBottom = await page
      .locator("header")
      .first()
      .evaluate((node) => node.getBoundingClientRect().bottom);
    const top = await heading.evaluate((node) => node.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(headerBottom);
    await context.setOffline(false);
  });
});

test.describe("lista offline: ordenação não salva", () => {
  test("com a lista anterior ela fica com o aviso, sem 'Atualizando resultados…' infinito", async ({
    page,
    context,
  }) => {
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await context.setOffline(true);
    await page.getByLabel("Ordenar por").selectOption({ label: "Menor preço" });
    const warning = page
      .getByRole("status")
      .filter({ hasText: "Sem internet para atualizar a lista" });
    await expect(warning).toBeVisible();
    await expect(warning).toContainText("A lista abaixo ainda é da seleção anterior.");
    await expect(page.getByText("Atualizando resultados…")).toHaveCount(0);
    await expect(page.getByText("Não foi possível carregar os hotéis")).toHaveCount(0);
    await expect(cards(page)).toHaveCount(10);
    // Voltou a rede: a lista atualiza sozinha e o aviso some.
    await context.setOffline(false);
    await expect(warning).toHaveCount(0);
    await expect(cards(page)).toHaveCount(10);
  });
});

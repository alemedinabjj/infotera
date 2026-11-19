import { expect, test } from "@playwright/test";
import { headerHeight, hotelPath, waitForHydration } from "./helpers/hotel-details";
import { CHECK_IN, cards, criteriaQuery, searchPath } from "./helpers/hotel-search";

// Mock-api real em :3333. Ids estáveis do seed: hotel 1 Copacabana Palace (Rio, 5 fotos, quartos
// de R$ 1.200 e R$ 800), hotel 4 (a partir de R$ 720), hotel 59 (Jericoacoara, 1 similar: 60).

// 1×1 GIF: as fotos do Unsplash não dependem da rede do ambiente (uma foto quebrada vira fallback e
// o `<img>` some, o que torna as asserções sobre `loading` instáveis).
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com/, (route) =>
    route.fulfill({ contentType: "image/gif", body: PIXEL }),
  );
});

test.describe("cabeçalho e navegação", () => {
  test("vindo da busca: h1, breadcrumb com os critérios e 'a partir de' pelos quartos", async ({
    page,
  }) => {
    await page.goto(searchPath());
    const first = cards(page).first();
    const name = (await first.getByRole("heading", { level: 3 }).textContent()) ?? "";
    await first.getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`checkIn=${CHECK_IN}`));
    const crumb = page.getByRole("navigation", { name: "Você está aqui" });
    await expect(crumb.getByRole("link", { name: "Hotéis em Rio de Janeiro, RJ" })).toHaveAttribute(
      "href",
      `/search?${criteriaQuery()}`,
    );
    await expect(page.getByRole("main")).toHaveCount(1);
  });

  test("hotel 1: título, h1 único e a partir de R$ 800; hotel 4: R$ 720", async ({ page }) => {
    await page.goto(hotelPath(1));
    await expect(page).toHaveTitle("Hotel Copacabana Palace | Infotera Hotéis");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByText(/a partir de R\$\s*800 por noite/)).toBeVisible();
    await expect(page.getByText("Sua estadia:", { exact: false }).first()).toBeVisible();
    await page.goto(hotelPath(4));
    await expect(page.getByText(/a partir de R\$\s*720 por noite/)).toBeVisible();
  });

  test("âncoras: abrir já na seção e por clique, com o título abaixo do header", async ({
    page,
  }) => {
    await page.goto(`${hotelPath(1)}#avaliacoes`);
    const reviews = page.getByRole("heading", { level: 2, name: "Avaliações" });
    await expect(reviews).toBeInViewport();
    await expect
      .poll(async () => (await reviews.boundingBox())?.y ?? 0)
      .toBeGreaterThanOrEqual(await headerHeight(page));

    await page.goto(hotelPath(1));
    await page
      .getByRole("navigation", { name: "Seções da página" })
      .getByRole("link", { name: "Políticas" })
      .click();
    const policies = page.getByRole("heading", { level: 2, name: "Políticas" });
    await expect(policies).toBeInViewport();
    await expect
      .poll(async () => (await policies.boundingBox())?.y ?? 0)
      .toBeGreaterThanOrEqual(await headerHeight(page));
  });
});

test.describe("galeria e lightbox", () => {
  test("abre em 'Ver todas', setas dão a volta, Home/End, Esc fecha e o foco volta", async ({
    page,
  }) => {
    await page.goto(hotelPath(1));
    await waitForHydration(page);
    const open = page.getByRole("button", { name: "Ver todas as fotos (5)" });
    await open.click();
    const dialog = page.getByRole("dialog", { name: "Fotos de Hotel Copacabana Palace" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Foto 1 de 5")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Próxima foto" })).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText("Foto 2 de 5")).toBeVisible();
    await page.keyboard.press("End");
    await expect(dialog.getByText("Foto 5 de 5")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText("Foto 1 de 5")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.getByText("Foto 5 de 5")).toBeVisible();
    await page.keyboard.press("Home");
    await expect(dialog.getByText("Foto 1 de 5")).toBeVisible();

    // Foco preso: Shift+Tab percorre os controles do dialog (anterior, fechar), sem sair dele.
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "Foto anterior" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "Fechar" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("miniaturas (≥ sm) abrem na foto escolhida; miniaturas carregam sob demanda", async ({
    page,
    isMobile,
  }) => {
    await page.goto(hotelPath(1));
    await waitForHydration(page);
    const thumb = page.getByRole("button", { name: "Abrir foto 3 de 5" });
    if (isMobile) {
      await expect(thumb).toBeHidden();
      return;
    }
    await expect(thumb.locator("img")).toHaveAttribute("loading", "lazy");
    await thumb.click();
    await expect(page.getByText("Foto 3 de 5")).toBeVisible();
    await page.getByRole("button", { name: "Fechar" }).click();
    await expect(thumb).toBeFocused();
  });
});

test.describe("seções estáticas", () => {
  test("política expansível por teclado e mapa com link do OpenStreetMap", async ({ page }) => {
    await page.goto(hotelPath(1));
    await expect(page.getByText("A partir de 15:00")).toBeVisible();
    await expect(page.getByText("Cancelamento grátis").first()).toBeVisible();
    const summary = page.getByText("Ver regras de cancelamento");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Cancele grátis até 48 horas antes do check-in.")).toBeVisible();

    await expect(page.getByRole("img", { name: /^Mapa: Av\. Atlântica/ })).toBeVisible();
    const osm = page.getByRole("link", { name: /Abrir no OpenStreetMap/ });
    await expect(osm).toHaveAttribute("target", "_blank");
    await expect(osm).toHaveAttribute("href", /mlat=-22\.9683&mlon=-43\.1792/);
  });

  test("hotéis similares: hotel 1 (17 primeiro, sem o 1) e hotel 59 (só o 60)", async ({
    page,
  }) => {
    await page.goto(hotelPath(1));
    const similar = page.locator("#similares");
    await expect(similar.getByRole("heading", { level: 2 })).toHaveText(
      "Hotéis similares em Rio de Janeiro, RJ",
    );
    await expect(similar.getByRole("article")).toHaveCount(4);
    await expect(similar.getByRole("article").first().getByRole("link")).toHaveAttribute(
      "href",
      new RegExp(`^/hotel/17\\?${criteriaQuery().replace(/[+?]/g, "\\$&")}`),
    );
    await expect(similar.locator("a[href^='/hotel/1?']")).toHaveCount(0);

    await page.goto("/hotel/59");
    await expect(page.locator("#similares").getByRole("article")).toHaveCount(1);
    await expect(page.locator("#similares").getByRole("article").getByRole("link")).toHaveAttribute(
      "href",
      "/hotel/60",
    );
  });
});

test.describe("compartilhar e prefetch", () => {
  test("copia a URL atual com os critérios e a URL copiada abre o mesmo hotel", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "clipboard só no Chromium");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(hotelPath(1));
    await waitForHydration(page);
    await page.getByRole("button", { name: "Copiar link" }).click();
    await expect(page.getByText("Link copiado.")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(page.url());
    expect(copied).toContain(`checkIn=${CHECK_IN}`);
    await page.goto(copied);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hotel Copacabana Palace");
  });

  test("com o prefetch do hover na busca, abrir o hotel não pede os quartos de novo", async ({
    page,
  }) => {
    await page.goto(searchPath());
    const card = cards(page).first();
    const prefetched = page.waitForRequest(/\/rooms\?hotelId=\d+/);
    await card.hover();
    await prefetched;
    const roomRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/rooms\?hotelId=/.test(request.url())) roomRequests.push(request.url());
    });
    await card.getByRole("link").click();
    await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Selecionar quarto/ }).first()).toBeVisible();
    expect(roomRequests).toEqual([]);
  });
});

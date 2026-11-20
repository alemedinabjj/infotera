import { expect, test } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { criteria, seedSelection } from "./helpers/checkout";
import { noHorizontalScroll } from "./helpers/hotel-details";
import { API_URL, criteriaQuery, searchPath } from "./helpers/hotel-search";
import { portugueseLeftovers } from "./helpers/language";

/** Caminho + query do `Location` (relativo ou absoluto). */
const locationOf = (headers: Record<string, string>): string => {
  const url = new URL(headers.location ?? "", "http://localhost");
  return `${url.pathname}${url.search}`;
};

const COOKIE = "infotera-locale";

test.describe("rotas por idioma", () => {
  test("sem prefixo abre em pt-BR; /en abre em en-US", async ({ request }) => {
    const pt = await request.get("/search?destination=Rio");
    expect(pt.status()).toBe(200);
    expect(await pt.text()).toContain('<html lang="pt-BR"');
    const en = await request.get("/en");
    expect(en.status()).toBe(200);
    expect(await en.text()).toContain('<html lang="en-US"');
  });

  test("o segmento interno redireciona (308) para a URL canônica", async ({ request }) => {
    const pt = await request.get("/pt-BR/search?x=1", { maxRedirects: 0 });
    expect(pt.status()).toBe(308);
    expect(locationOf(pt.headers())).toBe("/search?x=1");
    const en = await request.get("/en-US/hotel/1", { maxRedirects: 0 });
    expect(en.status()).toBe(308);
    expect(locationOf(en.headers())).toBe("/en/hotel/1");
  });

  test("caminho desconhecido no idioma é 404", async ({ request }) => {
    expect((await request.get("/en/xyz")).status()).toBe(404);
    expect((await request.get("/xyz")).status()).toBe(404);
  });

  test("cookie en-US redireciona (307) para /en; sem cookie, Accept-Language é ignorado", async ({
    request,
  }) => {
    const withCookie = await request.get("/hotel/1", {
      headers: { cookie: `${COOKIE}=en-US` },
      maxRedirects: 0,
    });
    expect(withCookie.status()).toBe(307);
    expect(locationOf(withCookie.headers())).toBe("/en/hotel/1");

    const withHeader = await request.get("/hotel/1", {
      headers: { "accept-language": "en-US,en;q=0.9" },
      maxRedirects: 0,
    });
    expect(withHeader.status()).toBe(200);
    expect(await withHeader.text()).toContain('<html lang="pt-BR"');
  });
});

test.describe("seletor de idioma", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "o fluxo roda no desktop");
  });

  test("troca para Português preservando a página, o cookie e a seleção", async ({ page }) => {
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    await page.goto(`/en/hotel/1?${criteriaQuery()}`);
    const link = page.getByRole("link", { name: "Switch language to Português" });
    // O href real só existe depois de hidratar: é o sinal de que o clique já é tratado.
    await expect(link).toHaveAttribute("href", `/hotel/1?${criteriaQuery()}`);
    await link.click();
    await expect(page).toHaveURL(`/hotel/1?${criteriaQuery()}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === COOKIE)?.value).toBe("pt-BR");
    const draft = await page.evaluate(() => sessionStorage.getItem("infotera:booking-draft"));
    expect(draft).toContain('"roomId":1');
  });

  test("em pt-BR leva para /en e, com o cookie, a escolha vale nas próximas visitas", async ({
    page,
  }) => {
    await page.goto("/search?destination=Rio");
    const link = page.getByRole("link", { name: "Mudar idioma para English" });
    await expect(link).toHaveAttribute("href", "/en/search?destination=Rio");
    await link.click();
    await expect(page).toHaveURL("/en/search?destination=Rio");
    await page.goto("/hotel/1");
    await expect(page).toHaveURL("/en/hotel/1");
  });
});

test("em 320 px o cabeçalho cabe sem rolagem horizontal e o seletor tem alvo de 44 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of ["/", "/en"]) {
    await page.goto(path);
    const link = page.getByRole("link", { name: /idioma|language/i });
    await expect(link).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
});

test.describe("idioma do texto em inglês", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "roda no desktop");
  });

  // Nomes próprios da API (hotéis, destinos) e a marca não são traduzidos.
  const PROPER = ["Infotera Hotéis", "Português", "Rio de Janeiro, RJ", "São Paulo, SP"];

  test("home em inglês: sem português, com lang e sem violações de acessibilidade", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1, name: "Find your hotel" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    expect(await portugueseLeftovers(page, PROPER)).toEqual([]);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("busca em inglês: lista, filtros e mapa sem português, links em /en e axe", async ({
    page,
    request,
  }) => {
    const names: unknown = await (
      await request.get(`${API_URL}/hotels?destination=${encodeURIComponent("Rio de Janeiro, RJ")}`)
    ).json();
    const hotelNames = Array.isArray(names)
      ? names.flatMap((item) =>
          item && typeof item === "object" && "name" in item && typeof item.name === "string"
            ? [item.name]
            : [],
        )
      : [];
    await page.goto(`/en${searchPath("map=1")}`);
    await expect(page.getByRole("heading", { level: 2, name: /hotels found/ })).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
    await expect(page.locator(".leaflet-marker-icon > span").first()).toBeVisible();
    const hrefs = await page
      .getByRole("article")
      .locator("a[data-hotel-link]")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^\/en\/hotel\//);
    expect(await portugueseLeftovers(page, [...PROPER, ...hotelNames])).toEqual([]);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("em 320 px a home e a busca em inglês não têm rolagem horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of ["/en", `/en${searchPath()}`]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);
    }
  });
});

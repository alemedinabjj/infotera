import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { createBooking } from "./helpers/booking";
import { collectCspViolations, criteria, seedSelection } from "./helpers/checkout";
import { hotelPath } from "./helpers/hotel-details";
import { cards, searchPath } from "./helpers/hotel-search";

// Só contra o build de produção (o service worker é desligado no `next dev`):
//   npm run build && npx next start -p 3100
//   PLAYWRIGHT_BASE_URL=http://localhost:3100 npm run test:e2e:build
// Fica de fora: o critério 42 (aviso de versão nova) precisa de dois builds; é coberto pelo teste de
// componente do `ServiceWorkerRegistrar` e por verificação manual (README).

// O `test` de `./fixtures` bloqueia service workers (o `page.route` não vê o que um SW pede). Aqui o
// SW é o objeto do teste: liga de volta; a fixture `tiles` ainda falha se um tile escapar.
test.use({
  serviceWorkers: "allow",
  // Pedidos do SW escapam do `route`: sem resolver o host dos tiles, eles falham em vez de bater no OSM.
  launchOptions: { args: ["--host-resolver-rules=MAP tile.openstreetmap.org ~NOTFOUND"] },
});
test.skip(!process.env.PLAYWRIGHT_BASE_URL, "service worker só no build de produção");
test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "o service worker é verificado no desktop");
});

/** Visita `/`, espera o registro ativo e recarrega: a partir daí o service worker controla a página. */
const controlledByServiceWorker = async (page: Page): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
};

/** URLs de todas as entradas de todos os caches do navegador. */
const cachedUrls = (page: Page): Promise<string[]> =>
  page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) urls.push(request.url);
    }
    return urls;
  });

/** PNG 1×1 (o conteúdo não importa; o que se verifica é onde a resposta é guardada). */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("service worker", () => {
  test("registra /serwist/sw.js com escopo / e responde sem cache do navegador", async ({
    page,
    request,
  }) => {
    const response = await request.get("/serwist/sw.js");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-cache");
    expect(response.headers()["service-worker-allowed"]).toBe("/");
    await page.goto("/");
    const registration = await page.evaluate(async () => {
      const ready = await navigator.serviceWorker.ready;
      return { scope: ready.scope, script: ready.active?.scriptURL ?? "" };
    });
    expect(registration.scope).toBe(`${new URL(page.url()).origin}/`);
    expect(registration.script).toMatch(/\/serwist\/sw\.js$/);
  });

  test("rotas visitadas online abrem offline: HTML do cache, lista do cache persistido e banner", async ({
    page,
    context,
  }) => {
    await controlledByServiceWorker(page);
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("infotera:query-cache") ?? ""))
      .toContain('"hotels"');
    await page.goto(hotelPath(1));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Maria Silva").first()).toBeVisible();

    await context.setOffline(true);
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await expect(page.getByRole("status").filter({ hasText: /sem internet/ })).toBeVisible();
    await page.goto(hotelPath(1));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /sem internet/ })).toBeVisible();
    await context.setOffline(false);
  });

  test("offline, uma rota nunca visitada mostra a página offline do idioma", async ({
    page,
    context,
  }) => {
    await controlledByServiceWorker(page);
    await context.setOffline(true);
    await page.goto(hotelPath(7));
    await expect(
      page.getByRole("heading", { level: 1, name: "Esta página não está disponível offline" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir para o início" })).toBeVisible();
    await page.goto("/en/hotel/7");
    await expect(
      page.getByRole("heading", { level: 1, name: "This page isn't available offline" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to homepage" })).toBeVisible();
    await context.setOffline(false);
  });

  test("checkout, confirmação e histórico nunca entram em cache e, offline, mostram a página offline", async ({
    page,
    context,
    request,
  }) => {
    await controlledByServiceWorker(page);
    const bookingId = await createBooking(request);
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    for (const path of [
      "/checkout",
      "/en/checkout",
      `/confirmation/${bookingId}`,
      `/en/confirmation/${bookingId}`,
      "/my-bookings",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("load");
    }
    const urls = await cachedUrls(page);
    expect(urls.length).toBeGreaterThan(0);
    // As páginas `/offline/checkout` e `/offline/bookings` são estáticas e sem dado: ficam no precache.
    for (const url of urls.filter((entry) => !/\/offline(?:[/?]|$)/.test(entry))) {
      expect(url, "entrada de cache privada").not.toMatch(/\/(checkout|confirmation|my-bookings)/);
    }
    // Nem a API com dado pessoal passa pelo service worker.
    expect(urls.some((url) => url.includes("/bookings") && !url.includes("/offline/"))).toBe(false);

    await context.setOffline(true);
    const heading = (name: string) => page.getByRole("heading", { level: 1, name });
    await page.goto("/checkout");
    await expect(heading("A reserva precisa de internet")).toBeVisible();
    await page.goto("/en/checkout");
    await expect(heading("Booking needs an internet connection")).toBeVisible();
    await page.goto(`/confirmation/${bookingId}`);
    await expect(heading("Suas reservas precisam de internet")).toBeVisible();
    await page.goto("/en/my-bookings");
    await expect(heading("Your bookings need an internet connection")).toBeVisible();
    await context.setOffline(false);
  });

  test("fotos do Unsplash e tiles do OSM (pedidos com CORS) ficam nos caches de imagens e tiles", async ({
    page,
    context,
  }) => {
    const cors = { "access-control-allow-origin": "*" };
    await context.route("https://images.unsplash.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "image/png", headers: cors, body: PNG }),
    );
    await context.route("https://tile.openstreetmap.org/**", (route) =>
      route.fulfill({ status: 200, contentType: "image/png", headers: cors, body: PNG }),
    );
    await controlledByServiceWorker(page);
    await page.goto(searchPath("map=1"));
    await expect(cards(page)).toHaveCount(10);
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeAttached();
    await expect
      .poll(async () => {
        const urls = await cachedUrls(page);
        return {
          photo: urls.some((url) => url.startsWith("https://images.unsplash.com/")),
          tile: urls.some((url) => url.startsWith("https://tile.openstreetmap.org/")),
        };
      })
      .toEqual({ photo: true, tile: true });
  });

  test("o checkout carregado por documento registra o service worker sem violação de CSP", async ({
    page,
  }) => {
    const violations = await collectCspViolations(page);
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    const nonces: string[] = [];
    for (let load = 0; load < 2; load += 1) {
      const response = await page.goto("/checkout");
      const csp = (await response?.headersArray())?.filter(
        (header) => header.name.toLowerCase() === "content-security-policy",
      );
      expect(csp).toHaveLength(1);
      const value = csp?.[0]?.value ?? "";
      expect(value).toContain("worker-src 'self'");
      expect(value).toContain("manifest-src 'self'");
      nonces.push(/'nonce-([^']+)'/.exec(value)?.[1] ?? "");
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    }
    expect(nonces[0]).toBeTruthy();
    expect(nonces[0]).not.toBe(nonces[1]);
    expect(await violations()).toEqual([]);
  });
});

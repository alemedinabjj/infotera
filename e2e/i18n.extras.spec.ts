import { randomUUID } from "node:crypto";
import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { FAVORITES_KEY, favoriteEntry, HISTORY_KEY, persisted, seedStorage } from "./extras";
import { analyzeAccessibility } from "./helpers/axe";
import { bookingPath, createBooking } from "./helpers/booking";
import { API_URL } from "./helpers/hotel-search";
import { portugueseLeftovers } from "./helpers/language";

// Confirmação, histórico e favoritos em en-US: sem português fora de conteúdo da API, com axe limpo.
// Nomes próprios e textos vindos da API (hotel, endereço, quarto, destino) não são traduzidos.

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "roda no desktop");
});

const strings = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
};

/** Textos da API (hotel 1 e seus quartos) que aparecem na tela e ficam no idioma original. */
const apiContent = async (request: APIRequestContext): Promise<string[]> => {
  const hotel: unknown = await (await request.get(`${API_URL}/hotels/1`)).json();
  const rooms: unknown = await (await request.get(`${API_URL}/rooms?hotelId=1`)).json();
  const names = (items: unknown): string[] =>
    Array.isArray(items) ? items.flatMap((item) => strings(item)) : strings(items);
  return names([hotel, rooms]).filter((text) => text.length > 2);
};

// Marca, nome próprio (Brasília) e e-mail mascarado (`a***@exemplo.com`) ficam como estão.
const PROPER = [
  "Infotera Hotéis",
  "Português",
  "Rio de Janeiro, RJ",
  "Brasília",
  "a***@exemplo.com",
];

const expectEnglishAndAccessible = async (page: Page, request: APIRequestContext) => {
  expect(await portugueseLeftovers(page, [...PROPER, ...(await apiContent(request))])).toEqual([]);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
};

test.describe("confirmação", () => {
  test("/en/confirmation/<id>: inglês, links em /en e axe limpo (pt e en)", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await page.goto(`/en${bookingPath(id)}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.getByRole("heading", { level: 1, name: "Booking confirmed" })).toBeFocused();
    await expect(page.getByText(/Booked on .*\(Brasília time\)/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Next steps" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View hotel page" })).toHaveAttribute(
      "href",
      "/en/hotel/1",
    );
    await expect(page.getByRole("link", { name: "Start a new search" })).toHaveAttribute(
      "href",
      "/en",
    );
    await expect(page).toHaveTitle("Booking confirmed | Infotera Hotéis");
    await expectEnglishAndAccessible(page, request);

    await page.goto(bookingPath(id));
    await expect(page.getByRole("heading", { level: 1, name: "Reserva confirmada" })).toBeFocused();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("/en/confirmation com reserva inexistente: 404 em inglês", async ({ page }) => {
    await page.goto(`/en${bookingPath(randomUUID())}`);
    await expect(page.getByRole("heading", { level: 1, name: "Booking not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start a new search" })).toHaveAttribute(
      "href",
      "/en",
    );
    expect(
      (await portugueseLeftovers(page, PROPER)).filter((text) => !/Infotera/.test(text)),
    ).toEqual([]);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });
});

test.describe("histórico e favoritos", () => {
  test("/en/my-bookings: inglês, datas e links em /en, aviso de computador compartilhado", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await seedStorage(page, HISTORY_KEY, [{ id, savedAt: new Date().toISOString() }]);
    await page.goto("/en/my-bookings");
    await expect(page.getByRole("heading", { level: 1, name: "My bookings" })).toBeVisible();
    await expect(page.getByText(/On a shared computer, clear the history/)).toBeVisible();
    await expect(page.getByRole("link", { name: /^View booking at / })).toHaveAttribute(
      "href",
      `/en/confirmation/${id}`,
    );
    await expect(page.getByRole("main")).toContainText(/Booked on \d{2}\/\d{2}\/\d{4}/);
    await expect(page.getByRole("main")).toContainText("3 nights");
    await expect(page).toHaveTitle("My bookings | Infotera Hotéis");
    await expectEnglishAndAccessible(page, request);

    await page.goto("/my-bookings");
    await expect(page.getByRole("heading", { level: 1, name: "Minhas reservas" })).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("/en/my-bookings vazio: estado vazio em inglês", async ({ page, request }) => {
    await page.goto("/en/my-bookings");
    await expect(page.getByText("No bookings in this browser")).toBeVisible();
    await expect(page.getByRole("link", { name: "Search hotels" })).toHaveAttribute("href", "/en");
    await expectEnglishAndAccessible(page, request);
  });

  test("/en/favorites: inglês, link do hotel em /en e axe limpo (pt e en)", async ({
    page,
    request,
  }) => {
    await seedStorage(page, FAVORITES_KEY, persisted([favoriteEntry(1)]));
    await page.goto("/en/favorites");
    await expect(page.getByRole("heading", { level: 1, name: "Favorites" })).toBeVisible();
    await expect(page.getByText("1 saved hotel")).toBeVisible();
    await expect(page.getByRole("link", { name: /Copacabana Palace/ }).first()).toHaveAttribute(
      "href",
      /^\/en\/hotel\/1/,
    );
    await expect(page).toHaveTitle("Favorites | Infotera Hotéis");
    await expectEnglishAndAccessible(page, request);

    await page.goto("/favorites");
    await expect(page.getByText("1 hotel salvo")).toBeVisible();
    await expect(page.getByText(/R\$\s800/)).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("/en/favorites vazio: estado vazio em inglês", async ({ page, request }) => {
    await page.goto("/en/favorites");
    await expect(page.getByText("No saved hotels yet")).toBeVisible();
    await expectEnglishAndAccessible(page, request);
  });
});

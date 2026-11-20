import { randomUUID } from "node:crypto";
import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { FAVORITES_KEY, favoriteEntry, HISTORY_KEY, persisted, seedStorage } from "./extras";
import { analyzeAccessibility } from "./helpers/axe";
import { bookingPath, createBooking } from "./helpers/booking";
import { criteria, futureExpiry, seedSelection } from "./helpers/checkout";
import { waitForHydration } from "./helpers/hotel-details";
import { API_URL, CHECK_IN, CHECK_OUT, criteriaQuery } from "./helpers/hotel-search";
import { portugueseLeftovers } from "./helpers/language";

// Critérios 9 e 12 da F7b e axe em pt e en em todas as páginas.

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "roda no desktop");
});

const strings = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
};

/** Todo texto vindo da API (hotéis, quartos, avaliações) e a marca: ficam no idioma original. */
const apiNames = async (request: APIRequestContext): Promise<string[]> => {
  const bodies = await Promise.all(
    ["/hotels", "/rooms", "/reviews"].map(async (path) =>
      (await request.get(API_URL + path)).json(),
    ),
  );
  const texts = strings(bodies).filter((text) => text.length > 2);
  return ["Infotera Hotéis", "Português", "Brasília", ...texts];
};

const expectEnglish = async (page: Page, names: string[]) => {
  expect(await portugueseLeftovers(page, names)).toEqual([]);
};

const UUID_PATH =
  /\/en\/confirmation\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const searchFromHome = async (page: Page, names: string[]) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1, name: "Find your hotel" })).toBeVisible();
  await expectEnglish(page, names);
  const destination = page.getByRole("combobox", { name: /Destination/ });
  await destination.focus();
  await destination.pressSequentially("rio", { delay: 30 });
  await page.getByRole("option", { name: /Rio de Janeiro, RJ/ }).click();
  await page.getByLabel(/Check-in/).fill(CHECK_IN);
  await page.getByLabel(/Check-out/).fill(CHECK_OUT);
  await page.getByRole("button", { name: "Search hotels" }).click();
  await expect(page).toHaveURL(/\/en\/search\?destination=Rio/);
  await expect(page.getByRole("article").first()).toBeVisible();
  await expectEnglish(page, names);
};

const pickHotelAndRoom = async (page: Page, names: string[]) => {
  await page.locator("a[data-hotel-link]").first().click();
  await expect(page).toHaveURL(/\/en\/hotel\/\d+/);
  await waitForHydration(page);
  await expectEnglish(page, names);
  await page
    .getByRole("button", { name: /^Select room/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/checkout/);
  await expect(page.getByRole("heading", { level: 2, name: "Guest details" })).toBeVisible();
  await expectEnglish(page, names);
};

const fillCheckout = async (page: Page, names: string[]) => {
  const holder = page.getByRole("group", { name: "Guest 1 · booking holder" });
  await holder.getByLabel("First name").fill("Ana");
  await holder.getByLabel("Last name").fill("Souza");
  await holder.getByLabel("Email", { exact: true }).fill("ana@example.net");
  await page.getByLabel("Phone number").fill("11987654321");
  const guest = page.getByRole("group", { name: /^Guest 2 ·/ });
  await guest.getByLabel("First name").fill("Bruno");
  await guest.getByLabel("Last name").fill("Souza");
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  await page.getByLabel("Card number").fill("4111 1111 1111 1111");
  await page.getByLabel("Name printed on the card").fill("ANA SOUZA");
  await page.getByLabel("Expiry date").fill(futureExpiry().replace("/", ""));
  await page.getByLabel("CVV").fill("123");
  await page.getByRole("textbox", { name: "CPF" }).fill("52998224725");
  await page.getByRole("button", { name: "Review booking", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Review and confirm" })).toBeVisible();
  await expectEnglish(page, names);
  await page.getByRole("button", { name: "Read terms and conditions" }).click();
  await page.getByRole("button", { name: "I have read and accept", exact: true }).click();
  await page.getByRole("button", { name: "Confirm booking", exact: true }).click();
};

test("critério 9: jornada inteira em /en sem português fora de [lang=pt-BR]", async ({
  page,
  request,
}) => {
  const names = await apiNames(request);
  await searchFromHome(page, names);
  await pickHotelAndRoom(page, names);
  await fillCheckout(page, names);
  await page.waitForURL(UUID_PATH);
  await expect(page.getByRole("heading", { level: 1, name: "Booking confirmed" })).toBeVisible();
  await expectEnglish(page, names);
});

test("critério 12: em /en o conteúdo da API fica em pt-BR e o resto em inglês", async ({
  page,
  request,
}) => {
  const hotel: unknown = await (await request.get(`${API_URL}/hotels/1`)).json();
  const description = hotel && typeof hotel === "object" ? Reflect.get(hotel, "description") : null;
  const reviews: unknown = await (await request.get(`${API_URL}/reviews?hotelId=1`)).json();
  const first = Array.isArray(reviews) ? reviews[0] : null;
  const comment = first && typeof first === "object" ? Reflect.get(first, "comment") : null;
  if (typeof description !== "string" || typeof comment !== "string") {
    throw new Error("seed sem descrição do hotel 1 ou avaliação");
  }
  await page.goto(`/en/hotel/1?${criteriaQuery()}`);
  await waitForHydration(page);
  await expect(page.locator('[lang="pt-BR"]', { hasText: description }).first()).toBeVisible();
  await expect(page.locator('main h3[lang="pt-BR"]').first()).toBeVisible();
  await expect(page.locator('[lang="pt-BR"]', { hasText: comment }).first()).toBeAttached();
  await expect(page.getByRole("heading", { level: 3, name: "Amenities" })).toBeVisible();
  await expect(page.getByText("Free cancellation").first()).toBeVisible();
});

type Locale = "pt" | "en";
type PageCase = { name: string; path: (request: APIRequestContext, page: Page) => Promise<string> };

const PAGES: PageCase[] = [
  { name: "home", path: async () => "/" },
  { name: "busca", path: async () => `/search?${criteriaQuery()}` },
  { name: "hotel", path: async () => `/hotel/1?${criteriaQuery()}` },
  {
    name: "checkout",
    path: async (_request, page) => {
      await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
      return "/checkout";
    },
  },
  {
    name: "confirmação",
    path: async (request) => bookingPath(await createBooking(request)),
  },
  {
    name: "favoritos",
    path: async (_request, page) => {
      await seedStorage(page, FAVORITES_KEY, persisted([favoriteEntry(1), favoriteEntry(4)]));
      return "/favorites";
    },
  },
  { name: "comparar", path: async () => "/compare?hotel=1&hotel=4" },
  {
    name: "histórico",
    path: async (request, page) => {
      const id = await createBooking(request);
      await seedStorage(page, HISTORY_KEY, [{ id, savedAt: new Date().toISOString() }]);
      return "/my-bookings";
    },
  },
  { name: "404", path: async () => `/hotel/99999` },
  { name: "404 de reserva", path: async () => bookingPath(randomUUID()) },
];

const withPrefix = (locale: Locale, path: string): string => {
  if (locale === "pt") return path;
  return path === "/" ? "/en" : `/en${path}`;
};

test.describe("axe (wcag2a/aa) em todas as páginas, em pt e en", () => {
  for (const locale of ["pt", "en"] as const) {
    for (const item of PAGES) {
      test(`${item.name} (${locale})`, async ({ page, request }) => {
        const path = await item.path(request, page);
        await page.goto(withPrefix(locale, path));
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const lang = locale === "pt" ? "pt-BR" : "en-US";
        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        const results = await analyzeAccessibility(page);
        expect(
          results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
        ).toEqual([]);
      });
    }
  }
});

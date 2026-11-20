import { type APIRequestContext, expect, test } from "@playwright/test";
import { formatBRL } from "../src/shared/lib/currency";
import { stayTotalWithFees } from "../src/shared/lib/pricing";
import {
  API_URL,
  CHECK_IN,
  CHECK_OUT,
  cardByName,
  cards,
  countHeading,
  criteriaQuery,
  hotelName,
  searchPath,
} from "./helpers/hotel-search";

// Card: preço do quarto mais barato que serve à busca, 1ª tela no celular, "Limpar filtros" inativo
// e atalho "Pular para os resultados". Os totais esperados saem dos quartos da própria API.

const NIGHTS = 3;
const SAO_PAULO = "São Paulo, SP";

type RoomRow = { pricePerNight: number; maxGuests: number; available: number };

const isRoomRow = (value: unknown): value is RoomRow =>
  typeof value === "object" &&
  value !== null &&
  "pricePerNight" in value &&
  typeof value.pricePerNight === "number" &&
  "maxGuests" in value &&
  typeof value.maxGuests === "number" &&
  "available" in value &&
  typeof value.available === "number";

/** Menor diária entre os quartos com vaga e capacidade para o grupo (1 quarto). */
const cheapestForParty = async (
  request: APIRequestContext,
  hotelId: number,
  guests: number,
): Promise<number> => {
  const response = await request.get(`${API_URL}/rooms?hotelId=${hotelId}`);
  const rooms: unknown = await response.json();
  if (!Array.isArray(rooms)) throw new Error("quartos inválidos");
  const prices = rooms
    .filter(isRoomRow)
    .filter((room) => room.available >= 1 && room.maxGuests >= guests)
    .map((room) => room.pricePerNight);
  return Math.min(...prices);
};

const partyPath = (destination: string, adults: number): string => {
  const params = new URLSearchParams(criteriaQuery(destination, CHECK_IN, CHECK_OUT));
  params.set("adults", String(adults));
  return `/search?${params.toString()}`;
};

test.describe("preço do card = quarto mais barato que serve", () => {
  test("Rio, 2 adultos: o hotel 1 mostra o total do quarto mais barato (não o pricePerNight do hotel)", async ({
    page,
    request,
  }) => {
    await page.goto(searchPath("", "Rio de Janeiro, RJ"));
    await expect(cards(page).first()).toBeVisible();
    const nightly = await cheapestForParty(request, 1, 2);
    const card = cardByName(page, await hotelName(request, 1));
    await expect(card).toContainText(
      formatBRL(stayTotalWithFees({ pricePerNight: nightly, nights: NIGHTS, rooms: 1 })),
    );
  });

  test("São Paulo, grupo de 3: hotel 20 mostra o quarto de 3 pessoas, não o mais barato do hotel", async ({
    page,
    request,
  }) => {
    await page.goto(partyPath(SAO_PAULO, 3));
    await expect(cards(page).first()).toBeVisible();
    const nightly = await cheapestForParty(request, 20, 3);
    expect(nightly).toBe(1310);
    const card = cardByName(page, await hotelName(request, 20));
    await expect(card).toContainText(
      formatBRL(stayTotalWithFees({ pricePerNight: nightly, nights: NIGHTS, rooms: 1 })),
    );
  });

  test("a lista pede os quartos num request só (hotelId repetido)", async ({ page }) => {
    const roomRequests: string[] = [];
    page.on("request", (item) => {
      if (new URL(item.url()).pathname === "/rooms") roomRequests.push(item.url());
    });
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    expect(roomRequests).toHaveLength(1);
    expect(new URL(roomRequests[0] ?? "").searchParams.getAll("hotelId")).toHaveLength(10);
  });
});

test.describe("celular 375x667", () => {
  test("nome do 1º hotel aparece na primeira tela", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(searchPath());
    await expect(cards(page).first()).toBeVisible();
    await expect(cards(page).first().getByRole("heading", { level: 3 })).toBeInViewport();
  });
});

test.describe("controles", () => {
  test("'Limpar filtros' sem filtro ativo parece (e é) inativo", async ({ page, isMobile }) => {
    test.skip(isMobile, "a sidebar de filtros é só desktop");
    await page.goto(searchPath());
    const clear = page.getByRole("button", { name: "Limpar filtros" }).first();
    await expect(clear).toHaveAttribute("aria-disabled", "true");
    await expect(clear).toHaveCSS("text-decoration-line", "none"); // só cinza, sem riscado
    await page.getByRole("checkbox", { name: "Piscina" }).check();
    await expect(clear).not.toHaveAttribute("aria-disabled", "true");
    await expect(clear).toHaveCSS("text-decoration-line", "none");
  });

  test("'Pular para os resultados' leva o foco ao h2 sem mudar a URL", async ({ page }) => {
    await page.goto(searchPath());
    await expect(cards(page).first()).toBeVisible();
    const before = page.url();
    const skip = page.getByRole("link", { name: "Pular para os resultados" });
    await skip.focus();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(countHeading(page)).toBeFocused();
    expect(page.url()).toBe(before);
  });
});

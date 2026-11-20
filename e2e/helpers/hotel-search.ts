import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { addDays, todayISO } from "../../src/shared/lib/dates";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export const RIO = "Rio de Janeiro, RJ";
export const CHECK_IN = addDays(todayISO(), 30);
export const CHECK_OUT = addDays(todayISO(), 33);

/** Critérios da F1 na ordem canônica (Rio, 3 noites, 1 quarto, 2 adultos). */
export const criteriaQuery = (
  destination = RIO,
  checkIn = CHECK_IN,
  checkOut = CHECK_OUT,
): string =>
  new URLSearchParams({
    destination,
    checkIn,
    checkOut,
    rooms: "1",
    adults: "2",
    children: "0",
  }).toString();

/** `/search?<critérios>` + filtros opcionais (`amenity=pool&amenity=spa`). */
export const searchPath = (filters = "", destination = RIO): string =>
  `/search?${criteriaQuery(destination)}${filters ? `&${filters}` : ""}`;

/** Nome do hotel direto da API (os ids da mock-api são estáveis). */
export const hotelName = async (request: APIRequestContext, id: number): Promise<string> => {
  const response = await request.get(`${API_URL}/hotels/${id}`);
  const body: unknown = await response.json();
  if (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof body.name === "string"
  ) {
    return body.name;
  }
  throw new Error(`hotel ${id} sem nome`);
};

/** O `<article>` do card do hotel pelo nome. */
export const cardByName = (page: Page, name: string): Locator =>
  page.getByRole("article").filter({ has: page.getByRole("link", { name, exact: true }) });

/** Os cards da lista (um `article` por hotel). */
export const cards = (page: Page): Locator => page.getByRole("article");

/** O h2 da contagem ("14 hotéis encontrados"), alvo de foco. */
export const countHeading = (page: Page): Locator =>
  page.getByRole("heading", { level: 2, name: /encontrados|Resultados|Nenhum hotel encontrado/ });

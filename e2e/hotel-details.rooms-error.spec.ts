import { type APIRequestContext, expect } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { hotelPath, roomCard } from "./helpers/hotel-details";
import { API_URL } from "./helpers/hotel-search";
import { controlledHotel, hotelRoomsRequest, test } from "./helpers/server-api";

// Critério 24 da F4: os quartos falham já na carga inicial (o servidor os busca e o erro vai
// dehidratado para o cliente). O proxy de controle responde 500 para `/rooms?hotelId=<hotel do
// worker>`; o retry da seção (request do navegador) passa pelo mesmo proxy. A falha inicial
// pode levar alguns segundos: o cliente repete a query (backoff) antes de mostrar o erro.

const ERROR_TITLE = "Não foi possível carregar os quartos.";
const FIRST_FAILURE_MS = 20_000;

const firstRoomName = async (hotelId: number, request: APIRequestContext) => {
  const rooms: unknown = await (await request.get(`${API_URL}/rooms?hotelId=${hotelId}`)).json();
  const first = Array.isArray(rooms) ? rooms[0] : undefined;
  if (typeof first?.name !== "string") throw new Error(`hotel ${hotelId} sem quartos`);
  return first.name;
};

test.describe("falha inicial dos quartos (critério 24)", () => {
  test.skip(
    process.env.E2E_PROD === "1",
    "só em dev: o build serve o hotel e os quartos do cache ISR, o servidor não chama a API",
  );

  test("erro só na seção, 'Preços indisponíveis', o resto da página funciona e o axe passa", async ({
    page,
    request,
    serverApi,
  }, testInfo) => {
    const hotelId = controlledHotel(testInfo.parallelIndex);
    const roomName = await firstRoomName(hotelId, request);
    await serverApi.failServerRequests(hotelRoomsRequest(hotelId));
    await page.goto(hotelPath(hotelId));
    await expect(page.getByRole("heading", { level: 3, name: ERROR_TITLE })).toBeVisible({
      timeout: FIRST_FAILURE_MS,
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Preços indisponíveis no momento.")).toBeVisible();
    // O overlay de erros do `next dev` (fora do `main`) mostra o erro do SSR; a página, não.
    await expect(page.getByRole("main").getByText("Falha simulada")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(1);
    await expect(roomCard(page, roomName)).toHaveCount(0);
    const results = await analyzeAccessibility(page);
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
    ).toEqual([]);
  });

  test("retry: falha de novo e o botão fica; com a API de volta, os quartos entram e o foco vai ao h2", async ({
    page,
    request,
    serverApi,
  }, testInfo) => {
    const hotelId = controlledHotel(testInfo.parallelIndex);
    const roomName = await firstRoomName(hotelId, request);
    await serverApi.failServerRequests(hotelRoomsRequest(hotelId));
    await page.goto(hotelPath(hotelId));
    const retry = page.getByRole("button", { name: "Tentar de novo" });
    await expect(retry).toBeVisible({ timeout: FIRST_FAILURE_MS });

    await retry.click();
    await expect(page.getByRole("heading", { level: 3, name: ERROR_TITLE })).toBeVisible();
    await expect(retry).toBeVisible();

    await serverApi.reset();
    const rooms = await serverApi.holdServerRequests(hotelRoomsRequest(hotelId));
    await retry.click();
    await rooms.waitForHit();
    await expect(page.getByRole("button", { name: "Tentando…" })).toBeVisible();
    await serverApi.release(rooms);
    await expect(roomCard(page, roomName)).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: ERROR_TITLE })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "Quartos" })).toBeFocused();
    await expect(page.getByText("Preços indisponíveis no momento.")).toHaveCount(0);
  });
});

import { type APIRequestContext, expect } from "@playwright/test";
import { hotelPath, roomCard } from "./helpers/hotel-details";
import { API_URL } from "./helpers/hotel-search";
import { controlledHotel, hotelRoomsRequest, test } from "./helpers/server-api";

// F7c: o servidor busca os quartos (`use cache`); o proxy de controle responde 500 para
// `/rooms?hotelId=<hotel do worker>`. Erro não vai para o cache, então a página cai no `error.tsx`.

const FIRST_FAILURE_MS = 20_000;

const firstRoomName = async (hotelId: number, request: APIRequestContext) => {
  const rooms: unknown = await (await request.get(`${API_URL}/rooms?hotelId=${hotelId}`)).json();
  const first = Array.isArray(rooms) ? rooms[0] : undefined;
  if (typeof first?.name !== "string") throw new Error(`hotel ${hotelId} sem quartos`);
  return first.name;
};

test.describe("falha dos quartos no servidor (F7c)", () => {
  // O catálogo vem de funções `"use cache" `: erro nunca é guardado e não há mais retry por seção. A falha
  // do servidor cai no `error.tsx` da rota (com retry da página inteira).
  test("a página mostra o erro da rota, sem vazar a mensagem da API, e o retry recupera", async ({
    page,
    request,
    serverApi,
  }, testInfo) => {
    const hotelId = controlledHotel(testInfo.parallelIndex);
    const roomName = await firstRoomName(hotelId, request);
    await serverApi.failServerRequests(hotelRoomsRequest(hotelId));
    await page.goto(hotelPath(hotelId));
    await expect(
      page.getByRole("heading", { level: 1, name: "Não foi possível abrir o hotel" }),
    ).toBeVisible({
      timeout: FIRST_FAILURE_MS,
    });
    await expect(page.getByRole("main").getByText("Falha simulada")).toHaveCount(0);
    await serverApi.reset();
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(roomCard(page, roomName)).toBeVisible();
  });
});

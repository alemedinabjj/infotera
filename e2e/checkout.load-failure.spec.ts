import { expect } from "@playwright/test";
import { criteria, seedSelection } from "./helpers/checkout";
import { API_URL } from "./helpers/hotel-search";
import { controlledHotel, hotelRequest, roomRequest, test } from "./helpers/server-api";

// Hotel e quarto do checkout falham (conexão): um único aviso de conexão com "Tentar de novo" fora
// do painel recolhível, e a barra fixa diz que o total não carregou. Falha pelo proxy de controle.

const FIRST_FAILURE_MS = 30_000;

const firstRoomId = async (
  request: { get: (url: string) => Promise<{ json: () => Promise<unknown> }> },
  hotelId: number,
): Promise<number> => {
  const rooms: unknown = await (await request.get(`${API_URL}/rooms?hotelId=${hotelId}`)).json();
  const first = Array.isArray(rooms) ? rooms[0] : undefined;
  if (typeof first?.id !== "number") throw new Error(`hotel ${hotelId} sem quartos`);
  return first.id;
};

test("hotel e quarto fora do ar: erro de conexão, um retry e total não carregado", async ({
  page,
  request,
  serverApi,
}, testInfo) => {
  const hotelId = controlledHotel(testInfo.parallelIndex);
  const roomId = await firstRoomId(request, hotelId);
  await serverApi.failServerRequests(hotelRequest(hotelId));
  await serverApi.failServerRequests(roomRequest(roomId));
  await seedSelection(page, {
    hotelId,
    roomId,
    criteria: criteria({ destination: "Florianópolis, SC", adults: 1 }),
  });
  await page.goto("/checkout");

  await expect(
    page.getByRole("heading", { name: "Não foi possível carregar os dados da reserva." }),
  ).toBeVisible({ timeout: FIRST_FAILURE_MS });
  await expect(page.getByText("Quarto indisponível")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(1);
  // A barra fixa (visível em qualquer largura) diz que o total não carregou.
  await expect(
    page.locator("[data-action-bar]").getByText("Total não carregado — tente de novo"),
  ).toBeVisible();

  await serverApi.reset();
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByRole("heading", { name: /Não foi possível carregar/ })).toHaveCount(0);
  await expect(page.getByText("Total não carregado — tente de novo")).toHaveCount(0);
});

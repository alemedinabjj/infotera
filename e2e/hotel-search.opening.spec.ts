import { expect } from "@playwright/test";
import { API_URL, cardByName, searchPath } from "./helpers/hotel-search";
import { controlledHotel, hotelRequest, test } from "./helpers/server-api";

// Navegação lenta até o hotel: o `GET /hotels/:id` do servidor fica preso pelo proxy de controle, e
// o clique precisa dar feedback na hora (selo "Abrindo…" no card e o skeleton da rota).

const fetchHotel = async (
  request: { get: (url: string) => Promise<{ json: () => Promise<unknown> }> },
  id: number,
): Promise<{ name: string; destination: string }> => {
  const body = await (await request.get(`${API_URL}/hotels/${id}`)).json();
  if (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    "destination" in body &&
    typeof body.name === "string" &&
    typeof body.destination === "string"
  ) {
    return { name: body.name, destination: body.destination };
  }
  throw new Error(`hotel ${id} inesperado`);
};

test("clicar no card dá feedback imediato enquanto o hotel demora", async ({
  page,
  request,
  serverApi,
}, testInfo) => {
  const id = controlledHotel(testInfo.parallelIndex);
  const { name, destination } = await fetchHotel(request, id);
  await page.goto(searchPath("", destination));
  const card = cardByName(page, name);
  await card.scrollIntoViewIfNeeded();
  const rule = await serverApi.holdServerRequests(hotelRequest(id));

  await card.getByRole("link", { name }).click();
  await expect(card.getByRole("status")).toHaveText("Abrindo…");
  await expect(page.getByText("Carregando hotel…")).toBeAttached();
  await expect(page).toHaveURL(new RegExp(`/hotel/${id}`));

  await rule.release();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

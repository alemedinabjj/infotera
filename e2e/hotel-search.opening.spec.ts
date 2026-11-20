import { expect } from "@playwright/test";
import { API_URL, cardByName, searchPath } from "./helpers/hotel-search";
import { controlledHotel, hotelRequest, test } from "./helpers/server-api";

// Navegação lenta até o hotel: o `GET /hotels/:id` do servidor fica preso pelo proxy de controle, e
// o clique precisa dar feedback na hora (selo "Abrindo…" no card).

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
  // F7c, critério 8: a página do hotel não tem `loading.tsx`. Enquanto o servidor segura o hotel, a busca
  // fica na tela e o selo do card é o único feedback; a rota só troca quando o hotel chega.
  await expect(page).not.toHaveURL(new RegExp(`/hotel/${id}`));

  await rule.release();
  await expect(page).toHaveURL(new RegExp(`/hotel/${id}`));
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { cardByName, criteriaQuery, hotelName } from "./helpers/hotel-search";

// Dinheiro: o total (com taxa de serviço e ISS) é o mesmo número no card da busca, no quarto do
// hotel e no checkout (sem cupom), para 1 e 2 quartos.

const MONEY = /R\$\s[\d.]+,\d{2}/;

for (const rooms of [1, 2]) {
  test(`total do card = total do hotel = total do checkout com ${rooms} quarto(s)`, async ({
    page,
    request,
  }) => {
    const params = new URLSearchParams(criteriaQuery());
    params.set("rooms", String(rooms));
    params.set("adults", String(rooms));
    const name = await hotelName(request, 1);

    await page.goto(`/search?${params.toString()}`);
    const card = cardByName(page, name);
    await expect(card).toContainText("total com taxas");
    const total = ((await card.textContent()) ?? "").match(MONEY)?.[0];
    expect(total).toBeDefined();
    if (!total) return;

    await card.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(/\/hotel\/1\?/);
    const room = page
      .getByRole("article")
      .filter({ hasText: "total com taxas" })
      .filter({ hasText: total });
    await expect(room.first()).toBeVisible();
    await room
      .first()
      .getByRole("button", { name: /^Selecionar quarto/ })
      .click();

    await expect(page).toHaveURL(/\/checkout$/);
    // A barra de ação (fixa no celular, card no desktop) mostra o total que será cobrado.
    await expect(page.locator("[data-action-bar]").getByText(total)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Sua reserva" })).toBeVisible();
  });
}

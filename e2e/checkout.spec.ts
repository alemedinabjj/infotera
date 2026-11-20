import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
  acceptTermsViaDialog,
  actionRequests,
  applyCoupon,
  clickPrimary,
  goToReview,
  stored,
} from "./helpers/checkout";
import { hotelPath, roomCard } from "./helpers/hotel-details";
import { API_URL, criteriaQuery } from "./helpers/hotel-search";

const UUID_PATH =
  /\/confirmation\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test.describe("fluxo feliz: da página do hotel à reserva criada", () => {
  test("seleciona a Suíte, preenche os 3 passos, aplica cupom e cria a reserva", async ({
    page,
    request,
  }) => {
    const calls = actionRequests(page);
    await page.goto(hotelPath(1, false, criteriaQuery().replace("children=0", "children=1")));
    await roomCard(page, "Suíte Deluxe Ocean View")
      .getByRole("button", { name: /^Selecionar quarto/ })
      .click();
    await expect(page).toHaveURL(/\/checkout$/);
    const navigation = await page.evaluate(
      () => performance.getEntriesByType("navigation")[0]?.name ?? "",
    );
    expect(navigation).toMatch(/\/checkout$/);

    await expect(page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" })).toBeVisible();
    await expect(page).toHaveTitle("Passo 1 de 3: Dados dos hóspedes | Infotera Hotéis");
    await goToReview(page, {
      companions: [
        { first: "Bruno", last: "Souza" },
        { first: "Clara", last: "Souza", age: "7" },
      ],
    });
    await applyCoupon(page, "bemvindo10");
    await expect(page.getByText("Cupom BEMVINDO10 aplicado.")).toBeAttached();
    await acceptTermsViaDialog(page);
    await expect(page.getByRole("checkbox", { name: /Li e aceito os termos/ })).toBeChecked();
    await clickPrimary(page, "Confirmar reserva");

    await page.waitForURL(UUID_PATH);
    const id = page.url().split("/").pop() ?? "";
    expect(calls).toHaveLength(1);

    const response = await request.get(`${API_URL}/bookings/${id}`);
    const raw = await response.text();
    const booking: unknown = JSON.parse(raw);
    expect(booking).toMatchObject({
      id,
      hotelId: 1,
      roomId: 1,
      rooms: 1,
      adults: 2,
      children: 1,
      totalPrice: 3726,
      payment: { method: "credit_card", cardLast4: "1111" },
      priceBreakdown: { totalCents: 372600, discountCents: 36000, couponCode: "BEMVINDO10" },
      guests: [
        { firstName: "Ana", lastName: "Souza", email: "ana@exemplo.com", phone: "+5511987654321" },
        { firstName: "Bruno", lastName: "Souza", kind: "adult" },
        { firstName: "Clara", lastName: "Souza", kind: "child", age: 7 },
      ],
    });
    for (const secret of ["4111", "529", "123"]) expect(raw).not.toContain(`"${secret}`);
    expect(raw).not.toMatch(/4111|52998224725|529\.982/);
    expect(JSON.stringify(booking)).not.toContain("cvv");

    // Depois de criada: nada de rascunho, e a página não voltou para `/`.
    expect(await stored(page, "infotera:checkout-draft")).toBeNull();
    expect(await stored(page, "infotera:booking-draft")).toBeNull();
  });
});

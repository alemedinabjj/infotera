import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
  acceptTermsViaDialog,
  actionRequests,
  clickPrimary,
  criteria,
  goToReview,
  seedSelection,
} from "./helpers/checkout";

// F7c, critério 23: o `POST` da Server Action do maior pedido possível passa com `bodySizeLimit: "64kb"`
// (4 quartos × 5 hóspedes, nomes de 60 letras). Só o build aplica o teto.

const NAME = "Maximiliano".repeat(5).slice(0, 60);
const BIGGEST = { rooms: 4, adults: 16, children: 4 };

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "o pedido máximo roda no desktop");
});

test("4 quartos × 5 hóspedes: a reserva passa pelo limite de corpo da action @prod", async ({
  page,
}) => {
  const calls = actionRequests(page);
  // Quarto 161 (hotel 60): 5 hóspedes por quarto e 6 disponíveis.
  await seedSelection(page, { hotelId: 60, roomId: 161, criteria: criteria(BIGGEST) });
  await page.goto("/checkout");
  const adults = Array.from({ length: BIGGEST.adults - 1 }, () => ({ first: NAME, last: NAME }));
  const children = Array.from({ length: BIGGEST.children }, () => ({
    first: NAME,
    last: NAME,
    age: "17",
  }));
  await goToReview(page, { companions: [...adults, ...children], holderLastName: NAME });
  await acceptTermsViaDialog(page);
  await clickPrimary(page, "Confirmar reserva");
  await page.waitForURL(/\/confirmation\//);

  expect(calls).toHaveLength(1);
  const size = Buffer.byteLength(calls[0]?.postData() ?? "");
  expect(size).toBeGreaterThan(3 * 1024);
  expect(size).toBeLessThan(64 * 1024);
});

import { expect } from "@playwright/test";
import {
  acceptTermsViaDialog,
  clickPrimary,
  criteria,
  goToReview,
  seedSelection,
} from "./helpers/checkout";
import { test } from "./helpers/server-api";

// Confirmar sem conexão: nem tenta (nada é cobrado) e mostra o alerta inline com "Tentar de novo";
// quando a conexão volta, o retry conclui a reserva.

const UUID_PATH = /\/confirmation\/[0-9a-f-]{36}$/;

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "estados rodam no desktop");
});

test("offline ao confirmar: alerta 'sem conexão' e retry conclui quando volta", async ({
  page,
  context,
}) => {
  await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
  await page.goto("/checkout");
  await page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" }).waitFor();
  await goToReview(page, { companions: [{ first: "Bruno", last: "Souza" }] });
  await acceptTermsViaDialog(page);

  await context.setOffline(true);
  await clickPrimary(page, "Confirmar reserva");
  await expect(page.getByText("Você está sem conexão.")).toBeVisible();
  await expect(
    page.getByText("Nada foi cobrado. Tente de novo quando a conexão voltar."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmando…" })).toHaveCount(0);

  await context.setOffline(false);
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page).toHaveURL(UUID_PATH);
});

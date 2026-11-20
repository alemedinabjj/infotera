import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import {
  acceptTermsViaDialog,
  clickPrimary,
  criteria,
  goToReview,
  seedSelection,
} from "./helpers/checkout";
import { API_URL } from "./helpers/hotel-search";
import { test } from "./helpers/server-api";

// A Server Action chama `POST /bookings` NO SERVIDOR do Next: o `page.route` não a vê. O proxy de
// controle responde 500 só ao POST cujo corpo leva o sobrenome único deste teste (marcador), então
// testes em paralelo não colidem. A regra age uma vez (`times: 1`): o retry cria a reserva.

const UUID_PATH = /\/confirmation\/[0-9a-f-]{36}$/;

/** Sobrenome só de letras (o formulário rejeita dígitos) e único por execução. */
const uniqueLastName = (): string =>
  `Marca${[...randomUUID().replaceAll("-", "").slice(0, 12)].map((c) => String.fromCharCode(97 + (Number.parseInt(c, 16) % 26))).join("")}`;

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "estados rodam no desktop");
});

test("POST /bookings 500 na Server Action: alerta inline sem cobrança; 'Tentar de novo' conclui", async ({
  page,
  request,
  serverApi,
}) => {
  const marker = uniqueLastName();
  const failure = await serverApi.failServerRequests(/^\/bookings$/, {
    method: "POST",
    body: marker,
    times: 1,
  });
  await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
  await page.goto("/checkout");
  await page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" }).waitFor();
  await goToReview(page, {
    holderLastName: marker,
    companions: [{ first: "Bruno", last: "Souza" }],
  });
  await acceptTermsViaDialog(page);
  await clickPrimary(page, "Confirmar reserva");

  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Não foi possível confirmar sua reserva" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Nenhuma cobrança foi feita.");
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByText("Falha simulada")).toHaveCount(0);
  await expect(page.getByText("ana@exemplo.com")).toBeVisible();
  await failure.waitForHit();

  await alert.getByRole("button", { name: "Tentar de novo" }).click();
  await page.waitForURL(UUID_PATH);
  const id = page.url().split("/").pop() ?? "";
  const found: unknown = await (await request.get(`${API_URL}/bookings?id=${id}`)).json();
  expect(Array.isArray(found) ? found : []).toHaveLength(1);
});

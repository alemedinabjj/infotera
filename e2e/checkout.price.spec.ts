import { expect, test } from "@playwright/test";
import { addDays } from "../src/shared/lib/dates";
import { applyCoupon, criteria, openCouponField, seedSelection } from "./helpers/checkout";
import { CHECK_IN } from "./helpers/hotel-search";

const nbsp = (text: string) => text.replaceAll(" ", " ");
const money = (value: string) => nbsp(value);

test.beforeEach(async ({ page: _page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium", "preço roda no desktop");
});

const open = async (page: import("@playwright/test").Page) => {
  await page.goto("/checkout");
  await page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" }).waitFor();
};

/** Erro do campo (`Field`), sem o anúncio `sr-only` do cupom que repete o texto. */
const fieldError = (page: import("@playwright/test").Page, text: string) =>
  page.locator("[id$='-error']").filter({ hasText: text });

const total = (page: import("@playwright/test").Page) =>
  page
    .getByRole("term")
    .filter({ hasText: /^Total$/ })
    .locator("xpath=following-sibling::*[1]");

test.describe("detalhamento e quartos", () => {
  test.beforeEach(async ({ page }) => {
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    await open(page);
  });

  test("1 quarto × 3 noites a R$ 1.200: estadia, taxa, ISS e total", async ({ page }) => {
    const summary = page.getByRole("region", { name: "Sua reserva" });
    await expect(summary).toContainText(money("R$ 1.200,00 × 3 noites × 1 quarto"));
    await expect(summary).toContainText(money("R$ 3.600,00"));
    await expect(summary).toContainText(`Taxa de serviço (10%)${money("R$ 360,00")}`);
    await expect(summary).toContainText(`ISS (5%)${money("R$ 180,00")}`);
    await expect(total(page)).toHaveText(money("R$ 4.140,00"));
  });

  test("aumentar para 2 quartos muda o total na hora e a API confirma", async ({ page }) => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/rooms/1*", async (route) => {
      await gate;
      await route.continue();
    });
    await page.getByRole("button", { name: "Adicionar quarto" }).click();
    await expect(total(page)).toHaveText(money("R$ 8.280,00"));
    await expect(page.getByText("Confirmando disponibilidade…")).toBeVisible();
    release();
    await expect(page.getByText("Confirmando disponibilidade…")).toHaveCount(0);
    await expect(total(page)).toHaveText(money("R$ 8.280,00"));
  });

  test("a API nega (available 1): volta para 1 quarto com o motivo", async ({ page }) => {
    await page.route("**/rooms/1*", async (route) => {
      const response = await route.fetch();
      const room: Record<string, unknown> = await response.json();
      await route.fulfill({ response, json: { ...room, available: 1 } });
    });
    await page.getByRole("button", { name: "Adicionar quarto" }).click();
    await expect(page.getByText("Só 1 quarto disponível.")).toBeVisible();
    await expect(total(page)).toHaveText(money("R$ 4.140,00"));
    await expect(page.getByRole("status").filter({ hasText: /^1$/ })).toBeVisible();
  });

  test("falha de rede na confirmação: volta e avisa", async ({ page }) => {
    await page.route("**/rooms/1*", (route) => route.abort());
    await page.getByRole("button", { name: "Adicionar quarto" }).click();
    await expect(
      page.getByText("Não foi possível confirmar a disponibilidade. Tente de novo."),
    ).toBeVisible();
    await expect(total(page)).toHaveText(money("R$ 4.140,00"));
  });

  test("limite: com 2 adultos o '+' para em 2 e mantém o foco", async ({ page }) => {
    const plus = page.getByRole("button", { name: "Adicionar quarto" });
    await plus.click();
    await expect(page.getByText("Confirmando disponibilidade…")).toHaveCount(0);
    await expect(plus).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText("Cada quarto precisa de pelo menos 1 adulto.")).toBeVisible();
    await plus.click({ force: true });
    await expect(plus).toBeFocused();
    await expect(total(page)).toHaveText(money("R$ 8.280,00"));
  });
});

test.describe("cupons", () => {
  test("formato inválido é rejeitado na hora, sem 'Aplicando…'; nada vai à rede", async ({
    page,
  }) => {
    const urls: string[] = [];
    page.on("request", (request) => urls.push(request.url()));
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    await open(page);
    await applyCoupon(page, "bem vindo10");
    await expect(fieldError(page, "Use de 4 a 12 letras ou números, sem espaços.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aplicando…" })).toHaveCount(0);
    await applyCoupon(page, "NAOEXISTE");
    await expect(fieldError(page, "Cupom não encontrado. Confira o código.")).toBeVisible();
    expect(urls.filter((url) => /coupon|cupom/i.test(url))).toEqual([]);
    await expect(total(page)).toHaveText(money("R$ 4.140,00"));
  });

  test("BEMVINDO10: aplicando, desconto, total e cache ao reaplicar", async ({ page }) => {
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    await open(page);
    await openCouponField(page);
    await page.getByLabel("Cupom de desconto").fill("bemvindo10");
    await page.getByRole("button", { name: "Aplicar cupom" }).click();
    await expect(page.getByRole("button", { name: "Aplicando…" })).toBeVisible();
    await expect(page.getByText("BEMVINDO10 · 10% de desconto")).toBeVisible();
    const summary = page.getByRole("region", { name: "Sua reserva" });
    await expect(summary).toContainText(`Desconto (BEMVINDO10)−${money("R$ 360,00")}`);
    await expect(total(page)).toHaveText(money("R$ 3.726,00"));
    await expect(page.getByRole("button", { name: "Remover cupom" })).toBeFocused();

    await page.getByRole("button", { name: "Remover cupom" }).click();
    await expect(page.getByLabel("Cupom de desconto")).toBeFocused();
    await expect(total(page)).toHaveText(money("R$ 4.140,00"));
    await page.getByLabel("Cupom de desconto").fill("BEMVINDO10");
    await page.getByRole("button", { name: "Aplicar cupom" }).click();
    // A 1ª consulta leva ~600 ms; a do cache é imediata.
    await expect(page.getByRole("button", { name: "Remover cupom" })).toBeVisible({ timeout: 300 });
    await expect(total(page)).toHaveText(money("R$ 3.726,00"));
  });

  test("VERAO2024 expirou e FERIAS15 pede 3 noites (2 noites)", async ({ page }) => {
    await seedSelection(page, {
      hotelId: 1,
      roomId: 1,
      criteria: criteria({ checkOut: addDays(CHECK_IN, 2) }),
    });
    await open(page);
    await applyCoupon(page, "VERAO2024");
    await expect(fieldError(page, "Este cupom expirou.")).toBeVisible();
    await page.getByLabel("Cupom de desconto").fill("FERIAS15");
    await page.getByRole("button", { name: "Aplicar cupom" }).click();
    await expect(fieldError(page, "Válido para estadias a partir de 3 noites.")).toBeVisible();
    await expect(total(page)).toHaveText(money("R$ 2.760,00"));
  });

  test("DESCONTO50 sai do total quando o subtotal cai e volta sem nova consulta", async ({
    page,
  }) => {
    await seedSelection(page, {
      hotelId: 13,
      roomId: 28,
      criteria: criteria({ checkOut: addDays(CHECK_IN, 1), rooms: 2 }),
    });
    await open(page);
    await applyCoupon(page, "DESCONTO50");
    await expect(page.getByText("DESCONTO50 · R$ 50,00 de desconto")).toBeVisible();
    await page.getByRole("button", { name: "Remover quarto" }).click();
    await expect(page.getByText("DESCONTO50 não vale para esta reserva")).toBeVisible();
    await expect(
      page.getByText("Válido para reservas a partir de R$ 300,00.").first(),
    ).toBeVisible();
    await expect(total(page)).toHaveText(money("R$ 230,00"));
    await page.getByRole("button", { name: "Adicionar quarto" }).click();
    await expect(page.getByText("DESCONTO50 · R$ 50,00 de desconto")).toBeVisible();
  });

  test("DESCONTO50 com subtotal abaixo de R$ 300 é recusado", async ({ page }) => {
    await seedSelection(page, {
      hotelId: 13,
      roomId: 28,
      criteria: criteria({ checkOut: addDays(CHECK_IN, 1) }),
    });
    await open(page);
    await applyCoupon(page, "DESCONTO50");
    await expect(fieldError(page, "Válido para reservas a partir de R$ 300,00.")).toBeVisible();
  });
});

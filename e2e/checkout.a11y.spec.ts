import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { analyzeAccessibility } from "./helpers/axe";
import {
  clickPrimary,
  criteria,
  fillPayment,
  fillPersonal,
  goToReview,
  seedSelection,
} from "./helpers/checkout";
import { noHorizontalScroll } from "./helpers/hotel-details";

const SEED = { hotelId: 1, roomId: 1, criteria: criteria() };
const COMPANION = [{ first: "Bruno", last: "Souza" }];

const openCheckout = async (page: Page) => {
  await seedSelection(page, SEED);
  await page.goto("/checkout");
  await page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" }).waitFor();
};

const expectNoViolations = async (page: Page) => {
  const results = await analyzeAccessibility(page);
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
  ).toEqual([]);
};

test.describe("axe", () => {
  test("passo 1, com o resumo de erros, passo 2, passo 3 e o dialog de termos", async ({
    page,
  }) => {
    await openCheckout(page);
    await expectNoViolations(page);

    await clickPrimary(page, "Continuar para pagamento");
    await expect(page.getByRole("alert").filter({ hasText: "Corrija" })).toBeVisible();
    await expectNoViolations(page);

    await fillPersonal(page, { companions: COMPANION });
    await clickPrimary(page, "Continuar para pagamento");
    await page.getByRole("heading", { level: 2, name: "Pagamento" }).waitFor();
    await expectNoViolations(page);

    await fillPayment(page);
    await clickPrimary(page, "Revisar reserva");
    await page.getByRole("heading", { level: 2, name: "Revise e confirme" }).waitFor();
    await expectNoViolations(page);

    await page.getByRole("button", { name: "Ler termos e condições" }).click();
    await expect(page.getByRole("region", { name: "Termos e condições da reserva" })).toBeFocused();
    await expectNoViolations(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Ler termos e condições" })).toBeFocused();
  });

  test("estado bloqueante (esgotado)", async ({ page }) => {
    await seedSelection(page, { hotelId: 19, roomId: 45, criteria: criteria() });
    await page.goto("/checkout");
    await page.getByRole("heading", { level: 1, name: "Este quarto esgotou" }).waitFor();
    await expectNoViolations(page);
  });
});

const tabTo = async (page: Page, target: Locator, max = 25) => {
  for (let index = 0; index < max; index += 1) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
};

test.describe("teclado", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "a ordem de Tab do celular tem a barra e o toggle do resumo");
  });

  test("o fluxo inteiro só com teclado até a reserva criada", async ({ page }) => {
    await openCheckout(page);
    const holder = page.getByRole("group", { name: "Hóspede 1 · titular da reserva" });
    await holder.getByLabel("Nome", { exact: true }).focus();
    await page.keyboard.type("Ana");
    await tabTo(page, holder.getByLabel("Sobrenome"));
    await page.keyboard.type("Souza");
    await tabTo(page, holder.getByLabel("E-mail"));
    await page.keyboard.type("ana@exemplo.com");
    await tabTo(page, page.getByLabel("Número de telefone"));
    await page.keyboard.type("11987654321");
    const companion = page.getByRole("group", { name: /^Hóspede 2 ·/ });
    await tabTo(page, companion.getByLabel("Nome", { exact: true }));
    await page.keyboard.type("Bruno");
    await tabTo(page, companion.getByLabel("Sobrenome"));
    await page.keyboard.type("Souza");
    await tabTo(page, page.getByRole("button", { name: "Continuar para pagamento" }));
    await page.keyboard.press("Enter");

    const payment = page.getByRole("heading", { level: 2, name: "Pagamento" });
    await expect(payment).toBeFocused();
    await tabTo(page, page.getByLabel("Número do cartão"));
    await page.keyboard.type("4111111111111111");
    await tabTo(page, page.getByLabel("Nome impresso no cartão"));
    await page.keyboard.type("ANA SOUZA");
    await tabTo(page, page.getByLabel("Validade"));
    await page.keyboard.type("1230");
    await tabTo(page, page.getByLabel("CVV"));
    await page.keyboard.type("123");
    await tabTo(page, page.getByRole("textbox", { name: "CPF" }));
    await page.keyboard.type("52998224725");
    await tabTo(page, page.getByRole("button", { name: "Revisar reserva" }));
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { level: 2, name: "Revise e confirme" })).toBeFocused();
    await tabTo(page, page.getByRole("checkbox", { name: /Li e aceito os termos/ }));
    await page.keyboard.press("Space");
    await tabTo(page, page.getByRole("button", { name: "Confirmar reserva", exact: true }));
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/confirmation\//);
  });
});

test.describe("320 px", () => {
  test("sem rolagem horizontal nos 3 passos", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openCheckout(page);
    expect(await noHorizontalScroll(page)).toBe(true);
    await fillPersonal(page, { companions: COMPANION });
    await clickPrimary(page, "Continuar para pagamento");
    await page.getByRole("heading", { level: 2, name: "Pagamento" }).waitFor();
    expect(await noHorizontalScroll(page)).toBe(true);
    await fillPayment(page);
    await clickPrimary(page, "Revisar reserva");
    await page.getByRole("heading", { level: 2, name: "Revise e confirme" }).waitFor();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("a barra fixa não cobre o campo focado nem o alerta de erro", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openCheckout(page);
    await goToReview(page, { companions: COMPANION });
    await clickPrimary(page, "Confirmar reserva");
    const checkbox = page.getByRole("checkbox", { name: /Li e aceito os termos/ });
    await expect(checkbox).toBeFocused();
    // O foco do campo vem depois do resumo de erros: espera a rolagem assentar.
    await expect
      .poll(async () => {
        const bar = await page
          .locator("[data-action-bar]")
          .evaluate((el) => el.getBoundingClientRect().top);
        const bottom = await checkbox.evaluate((el) => el.getBoundingClientRect().bottom);
        return bottom <= bar;
      })
      .toBe(true);
  });
});

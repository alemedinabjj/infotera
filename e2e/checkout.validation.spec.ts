import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
  clickPrimary,
  criteria,
  fillPayment,
  fillPersonal,
  seedSelection,
} from "./helpers/checkout";
import { headerHeight } from "./helpers/hotel-details";

const COMPANIONS = [
  { first: "Bruno", last: "Souza" },
  { first: "Clara", last: "Souza", age: "7" },
];

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium", "validação roda no desktop");
  await seedSelection(page, {
    hotelId: 1,
    roomId: 1,
    criteria: criteria({ children: 1 }),
  });
  await page.goto("/checkout");
  await page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" }).waitFor();
});

test.describe("passo 1", () => {
  test("vazio: não avança, foca o 1º campo, resumo lista tudo e fica abaixo do header", async ({
    page,
  }) => {
    await clickPrimary(page, "Continuar para pagamento");
    const holder = page.getByRole("group", { name: "Hóspede 1 · titular da reserva" });
    await expect(holder.getByLabel("Nome", { exact: true })).toBeFocused();
    await expect(page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" })).toBeVisible();
    const summary = page.getByRole("alert").filter({ hasText: "Corrija" });
    await expect(summary).toContainText("Corrija 9 campos para continuar");
    await expect(summary).toContainText("Titular — Nome: Informe o nome.");
    await expect(summary).toContainText("Hóspede 2 — Nome: Informe o nome.");
    await expect(summary).toContainText(
      "Hóspede 3 — Idade: Informe a idade da criança no check-in.",
    );
    const top = await summary.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(await headerHeight(page));
  });

  test("item do resumo leva o foco ao campo", async ({ page }) => {
    await clickPrimary(page, "Continuar para pagamento");
    await page.getByRole("button", { name: /Titular — E-mail/ }).click();
    await expect(page.getByLabel("E-mail")).toBeFocused();
  });

  test("e-mail, nome com dígito e telefone BR com DDD 20 mostram erro no campo", async ({
    page,
  }) => {
    const holder = page.getByRole("group", { name: "Hóspede 1 · titular da reserva" });
    await holder.getByLabel("Nome", { exact: true }).fill("Ana2");
    await holder.getByLabel("E-mail").fill("ana@");
    await page.getByLabel("Número de telefone").fill("20987654321");
    await page.getByLabel("Número de telefone").blur();
    await expect(page.getByText("Use só letras, espaços, hífen ou apóstrofo.")).toBeVisible();
    await expect(page.getByText("Digite um e-mail válido, como nome@exemplo.com.")).toBeVisible();
    await expect(page.getByText("O DDD 20 não existe. Confira o código da cidade.")).toBeVisible();
  });

  test("trocar o país reaplica a máscara e revalida; o foco fica no select", async ({ page }) => {
    const phone = page.getByLabel("Número de telefone");
    await phone.fill("11987654321");
    await expect(phone).toHaveValue("(11) 98765-4321");
    await phone.blur();
    const country = page.getByLabel("País do telefone");
    await country.focus();
    await country.selectOption("US");
    await expect(phone).toHaveValue("(119) 876-54321"); // sem truncar: excesso vira erro
    await expect(page.getByText("Como (201) 555-0123.", { exact: true })).toBeVisible();
    await expect(country).toBeFocused();
    await country.selectOption("BR");
    await expect(phone).toHaveValue("(11) 98765-4321");
  });

  test("apagar no meio do telefone não faz o cursor pular", async ({ page }) => {
    const phone = page.getByLabel("Número de telefone");
    await phone.fill("11987654321");
    await phone.evaluate((el) => {
      if (el instanceof HTMLInputElement) el.setSelectionRange(7, 7);
    });
    await phone.press("Backspace");
    await expect(phone).toHaveValue("(11) 9765-4321");
    expect(
      await phone.evaluate((el) => (el instanceof HTMLInputElement ? el.selectionStart : -1)),
    ).toBe(6);
  });

  test("clique 'humano' no Continuar logo depois de um e-mail inválido não se perde", async ({
    page,
  }) => {
    await fillPersonal(page, { companions: COMPANIONS });
    await page.getByLabel("E-mail").fill("ana@");
    const button = page.getByRole("button", { name: "Continuar para pagamento" });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    if (!box) throw new Error("botão sem caixa");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect(page.getByRole("alert").filter({ hasText: "Corrija 1 campo" })).toContainText(
      "Titular — E-mail",
    );
  });
});

test.describe("passo 2", () => {
  test.beforeEach(async ({ page }) => {
    await fillPersonal(page, { companions: COMPANIONS });
    await clickPrimary(page, "Continuar para pagamento");
    await page.getByRole("heading", { level: 2, name: "Pagamento" }).waitFor();
  });

  test("cartão com máscara e bandeira; Luhn, vencido, mês e CVV", async ({ page }) => {
    const number = page.getByLabel("Número do cartão");
    await number.fill("4111111111111112");
    await expect(number).toHaveValue("4111 1111 1111 1112");
    await expect(page.getByText("Bandeira: Visa")).toBeVisible();
    await number.blur();
    await expect(page.getByText("Número de cartão inválido.")).toBeVisible();

    const expiry = page.getByLabel("Validade");
    await expiry.fill("0120");
    await expect(expiry).toHaveValue("01/20");
    await expiry.blur();
    await expect(page.getByText("Cartão vencido.")).toBeVisible();
    await expiry.fill("1330");
    await expiry.blur();
    await expect(page.getByText("Mês inválido.")).toBeVisible();

    const cvv = page.getByLabel("CVV");
    await cvv.fill("12");
    await cvv.blur();
    await expect(page.getByText("Digite os 3 números do verso do cartão.")).toBeVisible();
  });

  test("CPF repetido e com DV errado são inválidos; passaporte troca a máscara", async ({
    page,
  }) => {
    const cpf = page.getByRole("textbox", { name: "CPF" });
    await cpf.fill("11111111111");
    await expect(cpf).toHaveValue("111.111.111-11");
    await cpf.blur();
    await expect(page.getByText("CPF inválido.")).toBeVisible();
    await cpf.fill("52998224724");
    await cpf.blur();
    await expect(page.getByText("CPF inválido.")).toBeVisible();

    await page.getByRole("radio", { name: "Passaporte" }).check();
    const passport = page.getByRole("textbox", { name: "Número do passaporte" });
    await expect(passport).toHaveValue("");
    await expect(page.getByText("CPF inválido.")).toHaveCount(0);
    await passport.fill("abc");
    await passport.blur();
    await expect(page.getByText("Passaporte inválido.")).toBeVisible();
    await passport.fill("fz123456");
    await expect(passport).toHaveValue("FZ123456");
    await passport.blur();
    await expect(page.getByText("Passaporte inválido.")).toHaveCount(0);
  });

  test("com tudo certo avança para a revisão com o cartão mascarado", async ({ page }) => {
    await fillPayment(page);
    await clickPrimary(page, "Revisar reserva");
    await expect(page.getByRole("heading", { level: 2, name: "Revise e confirme" })).toBeFocused();
    await expect(page.getByText(/Visa •••• 1111 · validade/)).toBeVisible();
    await expect(page.getByText("CPF ***.982.247-**")).toBeVisible();
    await expect(page.getByText("4111 1111 1111 1111")).toHaveCount(0);
  });
});

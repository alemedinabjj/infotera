import { expect, test } from "@playwright/test";
import { addDays, todayISO } from "../src/shared/lib/dates";
import { headerHeight, hotelPath, roomCard, waitForHydration } from "./helpers/hotel-details";
import { CHECK_IN, CHECK_OUT, criteriaQuery } from "./helpers/hotel-search";

// Seed: hotel 1 (Suíte R$ 1.200 máx. 3 · Standard R$ 800 máx. 2), hotel 7 (1 quarto sobrando),
// hotel 19 (esgotado), hotel 18 (4 quartos), hotel 2 (1 quarto).

test.describe("selecionar quarto", () => {
  test("Suíte grava a seleção no sessionStorage e navega para /checkout", async ({ page }) => {
    await page.goto(hotelPath(1));
    const suite = roomCard(page, "Suíte Deluxe Ocean View");
    await expect(suite).toContainText("R$ 3.600,00");
    await expect(suite).toContainText("total · 3 noites · 1 quarto");
    await expect(roomCard(page, "Quarto Standard")).toContainText("R$ 2.400,00");
    await suite.getByRole("button", { name: /^Selecionar quarto/ }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    const stored = await page.evaluate(() => sessionStorage.getItem("infotera:booking-draft"));
    expect(JSON.parse(stored ?? "{}")).toMatchObject({
      state: {
        selection: {
          hotelId: 1,
          roomId: 1,
          criteria: {
            destination: "Rio de Janeiro, RJ",
            checkIn: CHECK_IN,
            checkOut: CHECK_OUT,
            rooms: 1,
            adults: 2,
            children: 0,
          },
        },
      },
    });
  });

  test("3 adultos: o Standard (máx. 2) bloqueia com o motivo e o foco fica; a Suíte seleciona", async ({
    page,
  }) => {
    const query = criteriaQuery().replace("adults=2", "adults=3");
    await page.goto(`/hotel/1?${query}`);
    await waitForHydration(page);
    const standard = roomCard(page, "Quarto Standard");
    const button = standard.getByRole("button", { name: /Selecionar quarto/ });
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(standard).toContainText(
      "Acomoda até 2 hóspedes. Sua busca tem 3 por quarto. Escolha outro quarto ou altere os hóspedes.",
    );
    await expect(standard).not.toContainText("total ·");
    // `aria-disabled` não é "enabled" para o Playwright: o clique é forçado (mouse real).
    await button.click({ force: true });
    await expect(button).toBeFocused();
    await expect(page).toHaveURL(/\/hotel\/1/);
    await expect(
      roomCard(page, "Suíte Deluxe Ocean View").getByRole("button", { name: /Selecionar quarto/ }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  test("4 quartos num hotel com 3 disponíveis: selo e motivo, sem selecionar (hotel 2)", async ({
    page,
  }) => {
    const query = criteriaQuery().replace("rooms=1", "rooms=4").replace("adults=2", "adults=4");
    await page.goto(`/hotel/2?${query}`);
    const room = roomCard(page, "Quarto com Vista");
    await expect(room).toContainText("Só 3 disponíveis");
    await expect(room).toContainText(
      "Sua busca pede 4 quartos. Diminua a quantidade de quartos ou escolha outro tipo.",
    );
    await expect(room.getByRole("button", { name: /Selecionar quarto/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

test.describe("disponibilidade", () => {
  test("hotel 7: 'Apenas 1 quarto!' e continua selecionável", async ({ page }) => {
    await page.goto(hotelPath(7));
    const room = roomCard(page, "Ocean Suite Premium");
    await expect(room).toContainText("Apenas 1 quarto!");
    await expect(room.getByRole("button", { name: /Selecionar quarto/ })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("hotel 19 esgotado: alert com link para similares, botões 'Esgotado' e sem total", async ({
    page,
  }) => {
    await page.goto(hotelPath(19));
    const alert = page
      .getByRole("status")
      .filter({ hasText: "Este hotel está esgotado nestas datas" });
    await expect(alert).toBeVisible();
    await alert.getByRole("link", { name: "Ver hotéis similares" }).click();
    await expect(page).toHaveURL(/#similares$/);
    const room = roomCard(page, "Quarto Executivo");
    const button = room.getByRole("button", { name: /^Esgotado/ });
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(room).not.toContainText("total ·");
    await expect(page.getByText(/a partir de/).first()).toBeVisible();
  });
});

test.describe("sem datas", () => {
  test("'Escolher datas' foca o check-in; enviar as datas mostra os totais e foca 'Quartos'", async ({
    page,
  }) => {
    await page.goto(hotelPath(1, false));
    await waitForHydration(page);
    await expect(page.getByText("Escolha as datas para reservar")).toBeVisible();
    await expect(page.getByText("Destino", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    const suite = roomCard(page, "Suíte Deluxe Ocean View");
    await expect(suite).not.toContainText("total ·");

    await suite.getByRole("button", { name: /^Escolher datas/ }).click();
    const checkIn = page.getByLabel(/Check-in/);
    await expect(checkIn).toBeFocused();
    await expect
      .poll(async () => (await checkIn.boundingBox())?.y ?? 0)
      .toBeGreaterThanOrEqual(await headerHeight(page));

    const out = addDays(todayISO(), 33);
    await checkIn.fill(addDays(todayISO(), 30));
    await page.getByLabel(/Check-out/).fill(out);
    await page.getByRole("button", { name: "Ver disponibilidade" }).click();
    await expect(page).toHaveURL(new RegExp(`/hotel/1\\?.*checkIn=${CHECK_IN}&checkOut=${out}`));
    await expect(roomCard(page, "Suíte Deluxe Ocean View")).toContainText("R$ 3.600,00");
    await expect(
      roomCard(page, "Suíte Deluxe Ocean View").getByRole("button", { name: /^Selecionar quarto/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Quartos" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Alterar datas e hóspedes" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("com critérios: 'Alterar datas e hóspedes' abre o formulário preenchido", async ({
    page,
  }) => {
    await page.goto(hotelPath(1));
    await waitForHydration(page);
    const toggle = page.getByRole("button", { name: "Alterar datas e hóspedes" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel(/Check-in/)).toHaveValue(CHECK_IN);
    await expect(toggle).toBeFocused();
  });
});

test.describe("comparação", () => {
  test("hotel 18: tabela, linhas que diferem e 'Mostrar só diferenças'", async ({ page }) => {
    await page.goto(hotelPath(18));
    await waitForHydration(page);
    const toggle = page.getByRole("button", { name: "Comparar quartos (4)" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    const table = page.getByRole("table", { name: "Comparar quartos" });
    await expect(table.getByRole("columnheader")).toHaveCount(5);
    await expect(table.getByRole("rowheader", { name: /^Preço por noite/ })).toContainText(
      "diferente entre os quartos",
    );
    const all = await table.getByRole("row").count();
    const checkbox = page.getByRole("checkbox", { name: "Mostrar só diferenças" });
    await checkbox.check();
    await expect(checkbox).toBeFocused();
    expect(await table.getByRole("row").count()).toBeLessThanOrEqual(all);
    await checkbox.uncheck();
    await expect(table.getByRole("row")).toHaveCount(all);
  });

  test("hotel 2 (1 quarto): sem comparação", async ({ page }) => {
    await page.goto(hotelPath(2));
    await waitForHydration(page);
    await expect(page.getByText("1 tipo de quarto").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Comparar quartos/ })).toHaveCount(0);
  });
});

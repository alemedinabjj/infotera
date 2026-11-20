import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { analyzeAccessibility } from "./helpers/axe";

const destination = (page: Page) => page.getByRole("combobox", { name: /Destino/ });
const submit = (page: Page) => page.getByRole("button", { name: "Buscar hotéis" });
const checkInInput = (page: Page) => page.getByLabel(/Check-in/);
const checkOutInput = (page: Page) => page.getByLabel(/Check-out/);
const summary = (page: Page) => page.getByRole("alert").filter({ hasText: "Corrija" });

const FIXED_NOW = new Date("2026-06-15T15:00:00");
const TODAY = "2026-06-15";

const type = async (page: Page, text: string) => {
  await destination(page).focus();
  await destination(page).pressSequentially(text, { delay: 30 });
};

const pickDestination = async (page: Page, text: string, option: RegExp) => {
  await type(page, text);
  await page.getByRole("option", { name: option }).click();
};

const hasHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

/**
 * Clique de mouse "humano": mousedown, pausa, mouseup. O `click()` do Playwright é rápido demais
 * (mousedown e mouseup no mesmo tick) e esconde o problema de o layout mudar entre os dois eventos.
 */
const humanClick = async (page: Page, target: Locator) => {
  await target.scrollIntoViewIfNeeded();
  await target.hover();
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
};

const goHome = async (page: Page) => {
  await page.goto("/");
  await expect(submit(page)).toBeVisible();
};

test.describe("erro do blur não empurra o botão: o 1º clique de mouse conta", () => {
  // A validação do blur espera o clique em um botão terminar (useDeferredBlur). Antes, o erro
  // "Escolha um destino da lista." descia o botão ~26px entre mousedown e mouseup e o click se perdia.
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 375, height: 667 },
    { width: 320, height: 568 },
  ]) {
    test(`destino digitado sem escolher + clique de mouse em Buscar hotéis (${viewport.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await goHome(page);
      await checkInInput(page).fill("2030-01-10");
      await checkOutInput(page).fill("2030-01-12");
      await type(page, "flor");
      await expect(page.getByRole("option", { name: /Florianópolis/ })).toBeVisible();
      await humanClick(page, submit(page));
      await expect(summary(page)).toBeVisible({ timeout: 2000 });
      await expect(page.getByText("Escolha um destino da lista.").first()).toBeVisible();
    });

    test(`o mesmo com toque (${viewport.width}px)`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, hasTouch: true });
      const page = await context.newPage();
      await goHome(page);
      await checkInInput(page).fill("2030-01-10");
      await checkOutInput(page).fill("2030-01-12");
      await type(page, "flor");
      await expect(page.getByRole("option", { name: /Florianópolis/ })).toBeVisible();
      await submit(page).scrollIntoViewIfNeeded();
      await submit(page).tap();
      await expect(summary(page)).toBeVisible({ timeout: 2000 });
      await context.close();
    });
  }

  test("segundo clique (depois que o layout assentou) funciona: nada fica travado", async ({
    page,
  }) => {
    await goHome(page);
    await checkInInput(page).fill("2030-01-10");
    await checkOutInput(page).fill("2030-01-12");
    await type(page, "flor");
    await humanClick(page, submit(page));
    await humanClick(page, submit(page));
    await expect(summary(page)).toBeVisible();
    await expect(destination(page)).toBeFocused();
    await expect(page).toHaveURL(/\/$/);
  });

  test("com destino já escolhido e válido, o clique de mouse navega (sem deslocamento)", async ({
    page,
  }) => {
    await goHome(page);
    await pickDestination(page, "sao", /São Paulo, SP/);
    await checkInInput(page).fill("2030-01-10");
    await checkOutInput(page).fill("2030-01-12");
    await humanClick(page, submit(page));
    await expect(page).toHaveURL(/\/search\?destination=S%C3%A3o\+Paulo%2C\+SP&checkIn=2030-01-10/);
  });

  test("clique rápido (click do Playwright) com texto sem escolha mostra o resumo", async ({
    page,
  }) => {
    await goHome(page);
    await type(page, "flor");
    await submit(page).click();
    await expect(summary(page)).toBeVisible();
    await expect(destination(page)).toBeFocused();
    await expect(destination(page)).toHaveAttribute("aria-invalid", "true");
  });

  test("buscas recentes e 'Limpar buscas recentes' funcionam no 1º clique com destino inválido digitado", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const item = (destination: string) => ({
        destination,
        checkIn: "2030-01-10",
        checkOut: "2030-01-12",
        rooms: 1,
        adults: 2,
        children: 0,
      });
      window.localStorage.setItem(
        "infotera:recent-searches",
        JSON.stringify([item("Gramado, RS"), item("Natal, RN")]),
      );
    });
    await goHome(page);
    await type(page, "flor");
    await expect(page.getByRole("option", { name: /Florianópolis/ })).toBeVisible();
    await humanClick(page, page.getByRole("button", { name: /Natal, RN/ }));
    await expect(destination(page)).toHaveValue("Natal, RN");

    await type(page, "xyzw");
    await humanClick(page, page.getByRole("button", { name: "Limpar buscas recentes" }));
    await expect(page.getByRole("heading", { name: "Buscas recentes" })).toHaveCount(0);
  });
});

for (const width of [320, 375]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 700 } });

    test(`teclado completo, foco visível, sem scroll horizontal e axe limpo (${width}px)`, async ({
      page,
    }) => {
      await goHome(page);
      await type(page, "sao");
      await expect(page.getByRole("option", { name: /São Paulo, SP/ })).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
      const open = await analyzeAccessibility(page);
      expect(open.violations).toEqual([]);

      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await expect(destination(page)).toHaveValue("São Paulo, SP");

      await checkInInput(page).fill("2030-01-10");
      await checkOutInput(page).fill("2030-01-12");
      for (const name of ["Aumentar adultos", "Aumentar crianças", "Aumentar quartos"]) {
        const button = page.getByRole("button", { name });
        await button.focus();
        // Foco visível: o outline/box-shadow do :focus-visible não pode ser "none".
        const visible = await button.evaluate((el) => {
          const style = getComputedStyle(el);
          return style.outlineStyle !== "none" || style.boxShadow !== "none";
        });
        expect(visible, `foco visível em ${name}`).toBe(true);
      }
      await page.keyboard.press("Tab");
      await expect(submit(page)).toBeFocused();
      const focusVisible = await submit(page).evaluate((el) => {
        const style = getComputedStyle(el);
        return style.outlineStyle !== "none" || style.boxShadow !== "none";
      });
      expect(focusVisible).toBe(true);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/search\?destination=/);
    });

    test(`erros visíveis: sem scroll horizontal e axe limpo (${width}px)`, async ({ page }) => {
      await goHome(page);
      await submit(page).click();
      await expect(summary(page)).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
      const results = await analyzeAccessibility(page);
      expect(results.violations).toEqual([]);
      // Item do resumo foca o campo só por teclado.
      await page
        .getByRole("button", { name: /check-in/i })
        .first()
        .press("Enter");
      await expect(checkInInput(page)).toBeFocused();
    });
  });
}

test.describe("foco não fica atrás do header fixo (WCAG 2.4.11)", () => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 1280, height: 500 },
  ]) {
    test(`envio inválido com a página rolada: resumo e 1º campo ficam abaixo do header (${viewport.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await goHome(page);
      await submit(page).scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 400);
      await submit(page).press("Enter");
      await expect(summary(page)).toBeVisible();
      await expect(destination(page)).toBeFocused();
      const header = await page.locator("header").first().boundingBox();
      const alert = await summary(page).boundingBox();
      const field = await destination(page).boundingBox();
      expect(header).not.toBeNull();
      expect(alert).not.toBeNull();
      expect(field).not.toBeNull();
      const headerBottom = header ? header.y + header.height : 0;
      expect(alert?.y ?? -1).toBeGreaterThanOrEqual(headerBottom);
      expect(field?.y ?? -1).toBeGreaterThanOrEqual(headerBottom);
    });
  }

  test("restaurar busca recente de baixo da página traz o topo do formulário para a vista", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 500 });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "infotera:recent-searches",
        JSON.stringify([
          {
            destination: "Gramado, RS",
            checkIn: "2030-01-10",
            checkOut: "2030-01-12",
            rooms: 1,
            adults: 2,
            children: 0,
          },
        ]),
      );
    });
    await goHome(page);
    const item = page.getByRole("button", { name: /Gramado, RS/ });
    await item.scrollIntoViewIfNeeded();
    await item.click();
    await expect(submit(page)).toBeFocused();
    const header = await page.locator("header").first().boundingBox();
    const field = await destination(page).boundingBox();
    expect(field?.y ?? -1).toBeGreaterThanOrEqual(header ? header.y + header.height : 0);
  });
});

test.describe("datas com relógio fixo (page.clock)", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: FIXED_NOW });
    await goHome(page);
    await page.clock.resume();
  });

  test("critério 12: min do check-in é hoje; check-out tem min +1 e max +30", async ({ page }) => {
    await expect(checkInInput(page)).toHaveAttribute("min", TODAY);
    await checkInInput(page).fill("2026-07-01");
    await expect(checkOutInput(page)).toHaveAttribute("min", "2026-07-02");
    await expect(checkOutInput(page)).toHaveAttribute("max", "2026-07-31");
  });

  test("critério 16: 30 noites é aceito e 31 noites mostra erro", async ({ page }) => {
    await pickDestination(page, "sao", /São Paulo, SP/);
    await checkInInput(page).fill("2026-07-01");
    await checkOutInput(page).fill("2026-07-31");
    await expect(page.getByText("30 noites")).toBeVisible();
    await submit(page).click();
    await expect(page).toHaveURL(/checkOut=2026-07-31/);
  });

  test("critério 16: 31 noites bloqueia o envio com mensagem", async ({ page }) => {
    await pickDestination(page, "sao", /São Paulo, SP/);
    await checkInInput(page).fill("2026-07-01");
    await checkOutInput(page).fill("2026-08-01");
    await checkOutInput(page).blur();
    await expect(page.getByText("31 noites")).toHaveCount(0);
    await expect(page.getByText("A estadia pode ter no máximo 30 noites.")).toBeVisible();
    await submit(page).click();
    await expect(summary(page)).toBeVisible();
    await expect(checkOutInput(page)).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/$/);
  });

  test("critério 16: check-in hoje é aceito, ontem é bloqueado", async ({ page }) => {
    await pickDestination(page, "sao", /São Paulo, SP/);
    await checkInInput(page).fill("2026-06-14");
    await checkOutInput(page).fill("2026-06-16");
    await submit(page).click();
    await expect(summary(page)).toBeVisible();
    await expect(checkInInput(page)).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/$/);

    await checkInInput(page).fill(TODAY);
    await checkOutInput(page).fill("2026-06-16");
    await submit(page).click();
    await expect(page).toHaveURL(/checkIn=2026-06-15&checkOut=2026-06-16/);
  });

  test("critério 14: check-out ≤ check-in é ajustado para check-in + 1", async ({ page }) => {
    await checkOutInput(page).fill("2026-07-05");
    await checkInInput(page).fill("2026-07-10");
    await expect(checkOutInput(page)).toHaveValue("2026-07-11");
  });

  test("virada da meia-noite: a validação usa o 'hoje' do momento do envio", async ({ page }) => {
    await pickDestination(page, "sao", /São Paulo, SP/);
    await checkInInput(page).fill(TODAY);
    await checkOutInput(page).fill("2026-06-16");
    await page.clock.fastForward("12:00:00"); // vira para 16/06 com a aba aberta
    await submit(page).click();
    await expect(summary(page)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("quartos e hóspedes nos limites", () => {
  const stepper = (page: Page, verb: "Aumentar" | "Diminuir", field: string) =>
    page.getByRole("button", { name: `${verb} ${field}` });

  const raise = async (page: Page, field: string, times: number) => {
    for (let i = 0; i < times; i++) await stepper(page, "Aumentar", field).click();
  };

  test.beforeEach(async ({ page }) => {
    await goHome(page);
  });

  test("critério 18: 1 quarto com 5 hóspedes bloqueia + de adultos e crianças", async ({
    page,
  }) => {
    for (let i = 0; i < 3; i++) await stepper(page, "Aumentar", "crianças").click();
    await expect(stepper(page, "Aumentar", "adultos")).toHaveAttribute("aria-disabled", "true");
    await expect(stepper(page, "Aumentar", "crianças")).toHaveAttribute("aria-disabled", "true");
    // clique em botão aria-disabled não muda o valor
    await stepper(page, "Aumentar", "crianças").click({ force: true });
    await expect(page.getByRole("group", { name: "Crianças" }).getByRole("status")).toHaveText("3");
  });

  test("critério 17: mínimos desabilitados e quartos limitados pelos adultos", async ({ page }) => {
    await expect(stepper(page, "Diminuir", "quartos")).toHaveAttribute("aria-disabled", "true");
    await expect(stepper(page, "Diminuir", "crianças")).toHaveAttribute("aria-disabled", "true");
    // 2 adultos: no máximo 2 quartos (adultos ≥ quartos)
    await stepper(page, "Aumentar", "quartos").click();
    await expect(stepper(page, "Aumentar", "quartos")).toHaveAttribute("aria-disabled", "true");
  });

  test("critério 17/18: 4 quartos, 16 adultos e envio com limites extremos", async ({ page }) => {
    await raise(page, "adultos", 2); // 4 adultos: libera 4 quartos (quartos ≤ adultos)
    await raise(page, "quartos", 3);
    await raise(page, "adultos", 12); // 4 quartos: até 16 adultos
    await expect(stepper(page, "Aumentar", "adultos")).toHaveAttribute("aria-disabled", "true");
    await expect(stepper(page, "Aumentar", "quartos")).toHaveAttribute("aria-disabled", "true");
    await pickDestination(page, "sao", /São Paulo, SP/);
    await checkInInput(page).fill("2030-01-10");
    await checkOutInput(page).fill("2030-01-12");
    await submit(page).click();
    await expect(page).toHaveURL(/rooms=4&adults=16&children=0/);
  });

  test("critério 18: teto de 20 hóspedes com 4 quartos: 16 adultos permitem só 4 crianças", async ({
    page,
  }) => {
    await raise(page, "adultos", 2);
    await raise(page, "quartos", 3);
    await raise(page, "adultos", 12);
    await raise(page, "crianças", 4);
    await expect(stepper(page, "Aumentar", "crianças")).toHaveAttribute("aria-disabled", "true");
  });

  test("critério 18: máximo de 10 crianças com 4 quartos e 10 adultos", async ({ page }) => {
    await raise(page, "adultos", 2);
    await raise(page, "quartos", 3);
    await raise(page, "adultos", 6); // 10 adultos em 4 quartos
    await raise(page, "crianças", 10);
    await expect(stepper(page, "Aumentar", "crianças")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("group", { name: "Crianças" }).getByRole("status")).toHaveText(
      "10",
    );
  });
});

test.describe("localStorage degradado (critério 24)", () => {
  test("JSON corrompido não quebra a página nem mostra a seção", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("infotera:recent-searches", "{not json");
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await goHome(page);
    await expect(page.getByRole("heading", { name: "Buscas recentes" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("itens inválidos são descartados e os válidos aparecem", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "infotera:recent-searches",
        JSON.stringify([
          { destination: "", checkIn: "x", checkOut: "y", rooms: 9, adults: 0, children: 0 },
          {
            destination: "São Paulo, SP",
            checkIn: "2030-01-10",
            checkOut: "2030-01-12",
            rooms: 1,
            adults: 2,
            children: 0,
          },
          42,
        ]),
      );
    });
    await goHome(page);
    await expect(page.getByRole("button", { name: /São Paulo, SP/ })).toHaveCount(1);
  });

  test("localStorage cheio (setItem lança) não impede o envio nem quebra a página", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("quota", "QuotaExceededError");
      };
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await goHome(page);
    await pickDestination(page, "sao", /São Paulo, SP/);
    await checkInInput(page).fill("2030-01-10");
    await checkOutInput(page).fill("2030-01-12");
    await submit(page).click();
    await expect(page).toHaveURL(/\/search\?destination=/);
    expect(errors).toEqual([]);
  });

  test("localStorage inacessível (getItem lança) não quebra a página", async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new DOMException("denied", "SecurityError");
      };
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await goHome(page);
    await expect(page.getByRole("heading", { name: "Buscas recentes" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("critério 23: busca recente com check-in no passado preenche o resto e foca o check-in", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "infotera:recent-searches",
        JSON.stringify([
          {
            destination: "Gramado, RS",
            checkIn: "2020-01-10",
            checkOut: "2020-01-12",
            rooms: 1,
            adults: 3,
            children: 1,
          },
        ]),
      );
    });
    await goHome(page);
    await page.getByRole("button", { name: /Gramado, RS/ }).click();
    await expect(destination(page)).toHaveValue("Gramado, RS");
    await expect(checkInInput(page)).toHaveValue("");
    await expect(checkInInput(page)).toBeFocused();
    await expect(
      page.getByText("As datas dessa busca já passaram. Escolha novas datas.").first(),
    ).toBeAttached();
  });
});

import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
  acceptTermsViaDialog,
  actionRequests,
  clickPrimary,
  collectCspViolations,
  criteria,
  fillPayment,
  fillPersonal,
  goToReview,
  seedSelection,
  stored,
} from "./helpers/checkout";
import { waitForHydration } from "./helpers/hotel-details";
import { criteriaQuery } from "./helpers/hotel-search";

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "segurança roda no desktop");
});

const SEED = { hotelId: 1, roomId: 1, criteria: criteria() };

test.describe("CSP e cache do documento @prod", () => {
  test("um único header, com nonce novo a cada carga, sem unsafe-inline em script-src", async ({
    page,
  }) => {
    await seedSelection(page, SEED);
    const nonces: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const response = await page.goto("/checkout");
      const headers = (await response?.headersArray()) ?? [];
      const csp = headers.filter((h) => h.name.toLowerCase() === "content-security-policy");
      expect(csp).toHaveLength(1);
      const value = csp[0]?.value ?? "";
      const nonce = /'nonce-([^']+)'/.exec(value)?.[1];
      expect(nonce).toBeTruthy();
      nonces.push(nonce ?? "");
      expect(value).toContain("'strict-dynamic'");
      const scriptSrc = value.split("; ").find((part) => part.startsWith("script-src")) ?? "";
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(value).toContain("https://images.unsplash.com");
      const cache = headers.find((h) => h.name.toLowerCase() === "cache-control");
      expect(cache?.value).toContain("no-store");
    }
    expect(nonces[0]).not.toBe(nonces[1]);
  });

  test("as outras rotas mantêm a política base (um header, sem nonce)", async ({ page }) => {
    const response = await page.goto("/");
    const csp = ((await response?.headersArray()) ?? []).filter(
      (h) => h.name.toLowerCase() === "content-security-policy",
    );
    expect(csp).toHaveLength(1);
    expect(csp[0]?.value).not.toContain("nonce-");
  });

  test("navegação client-side para /checkout recarrega uma única vez", async ({ page }) => {
    await page.goto(`/hotel/1?${criteriaQuery()}`);
    await waitForHydration(page);
    await page.evaluate((value) => {
      sessionStorage.setItem(
        "infotera:booking-draft",
        JSON.stringify({ state: { selection: value }, version: 1 }),
      );
    }, SEED);
    let loads = 0;
    page.on("load", () => {
      loads += 1;
    });
    await page.evaluate(() => {
      const router: unknown = Reflect.get(Reflect.get(window, "next") ?? {}, "router");
      if (typeof router === "object" && router !== null && "push" in router) {
        const push: unknown = router.push;
        if (typeof push === "function") push.call(router, "/checkout");
      }
    });
    await expect(page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(loads).toBe(1);
    const entry = await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.name);
    expect(entry).toMatch(/\/checkout$/);
  });
});

test.describe("fluxo completo sob a CSP @prod", () => {
  test("nenhuma violação, nenhum console com dados e o corpo da action sem cartão nem CPF", async ({
    page,
  }) => {
    const violations = await collectCspViolations(page);
    const logs: string[] = [];
    page.on("console", (message) => logs.push(message.text()));
    const calls = actionRequests(page);
    await seedSelection(page, SEED);
    await page.goto("/checkout");
    await goToReview(page, { companions: [{ first: "Bruno", last: "Souza" }] });
    await acceptTermsViaDialog(page);
    await clickPrimary(page, "Confirmar reserva");
    await page.waitForURL(/\/confirmation\//);

    expect(await violations()).toEqual([]);
    expect(calls).toHaveLength(1);
    const body = calls[0]?.postData() ?? "";
    for (const secret of ["4111", "52998224725", "529.982", "cardNumber", "cvv", "ANA SOUZA"]) {
      expect(body).not.toContain(secret);
    }
    expect(body).toContain("1111");
    expect(logs.filter((text) => /Ana|Souza|4111|ana@exemplo/.test(text))).toEqual([]);
  });
});

test.describe("privacidade do navegador", () => {
  test.beforeEach(async ({ page }) => {
    await seedSelection(page, SEED);
    await page.goto("/checkout");
    await fillPersonal(page, { companions: [{ first: "Bruno", last: "Souza" }] });
    await clickPrimary(page, "Continuar para pagamento");
    await page.getByRole("heading", { level: 2, name: "Pagamento" }).waitFor();
    await fillPayment(page);
  });

  test("o rascunho só tem o permitido (nome, e-mail, telefone, passo)", async ({ page }) => {
    await page.waitForTimeout(700);
    const draft = (await stored(page, "infotera:checkout-draft")) ?? "";
    expect(draft).toContain("ana@exemplo.com");
    expect(draft).toContain('"step":"payment"');
    for (const secret of ["4111", "ANA SOUZA", "52998224725", "529.982", "123", "/2"]) {
      expect(draft).not.toContain(secret);
    }
    const all = await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }));
    expect(all).not.toContain("4111");
    expect(all).not.toContain("52998224725");
  });

  test("sair e voltar: o pagamento está vazio e o aviso explica", async ({ page }) => {
    await page.waitForTimeout(700);
    await page.goto("/");
    await page.goBack();
    await expect(page.getByRole("heading", { level: 2, name: "Pagamento" })).toBeVisible();
    await expect(page.getByLabel("Número do cartão")).toHaveValue("");
    await expect(page.getByLabel("Nome impresso no cartão")).toHaveValue("");
    await expect(page.getByLabel("CVV")).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "CPF" })).toHaveValue("");
    await expect(
      page.getByText(
        "Por segurança, os dados do cartão não ficam salvos. Preencha o pagamento de novo.",
      ),
    ).toBeVisible();
  });

  test("recarregar no passo 2 restaura o passo 1 e deixa o pagamento vazio", async ({ page }) => {
    await page.waitForTimeout(700);
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Pagamento" })).toBeVisible();
    await expect(page.getByLabel("Número do cartão")).toHaveValue("");
    await clickPrimary(page, "Voltar");
    await expect(page.getByLabel("E-mail")).toHaveValue("ana@exemplo.com");
  });
});

import { expect, type Page, type Route } from "@playwright/test";
import { addDays, todayISO } from "../src/shared/lib/dates";
import {
  acceptTermsViaDialog,
  actionRequests,
  clickPrimary,
  criteria,
  goToReview,
  seedSelection,
} from "./helpers/checkout";
import { API_URL } from "./helpers/hotel-search";
import { test } from "./helpers/mock-api-server";

const UUID_PATH = /\/confirmation\/[0-9a-f-]{36}$/;

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "estados rodam no desktop");
});

const reroute = async (page: Page, pattern: string, apiUrl: string) => {
  const handler = (route: Route) => {
    const original = new URL(route.request().url());
    return route.continue({ url: `${apiUrl}${original.pathname}${original.search}` });
  };
  await page.route(pattern, handler);
  return handler;
};

const isAction = (route: Route): boolean =>
  route.request().method() === "POST" && route.request().headers()["next-action"] !== undefined;

test.describe("sem seleção", () => {
  test("skeleton, depois `/` com toast; o formulário nunca aparece e Voltar não reabre o checkout", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      new MutationObserver(() => {
        const seen = [...document.querySelectorAll("h2")].some(
          (h2) => h2.textContent === "Dados dos hóspedes",
        );
        if (seen) Reflect.set(window, "__formSeen", true);
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto("/");
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/\?notice=choose-room$/);
    await expect(page.getByText("Escolha um quarto para continuar.")).toBeVisible();
    expect(await page.evaluate(() => Reflect.get(window, "__formSeen") === true)).toBe(false);
    await page.goBack();
    await expect(page).not.toHaveURL(/\/checkout/);
  });
});

test.describe("estados bloqueantes", () => {
  test("quarto esgotado (hotel 19)", async ({ page }) => {
    await seedSelection(page, { hotelId: 19, roomId: 45, criteria: criteria() });
    await page.goto("/checkout");
    await expect(
      page.getByRole("heading", { level: 1, name: "Este quarto esgotou" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver quartos" })).toHaveAttribute(
      "href",
      /^\/hotel\/19\?destination=/,
    );
    await expect(page.getByRole("form")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Fazer nova busca" })).toBeVisible();
  });

  test("check-in passado leva ao hotel sem critérios", async ({ page }) => {
    const yesterday = addDays(todayISO(), -1);
    await seedSelection(page, {
      hotelId: 1,
      roomId: 1,
      criteria: criteria({ checkIn: yesterday, checkOut: addDays(yesterday, 2) }),
    });
    await page.goto("/checkout");
    await expect(
      page.getByRole("heading", { level: 1, name: "As datas desta reserva já passaram" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Escolher novas datas" })).toHaveAttribute(
      "href",
      "/hotel/1",
    );
  });

  test("3 quartos num quarto com 1 disponível (hotel 7)", async ({ page }) => {
    await seedSelection(page, {
      hotelId: 7,
      roomId: 10,
      criteria: criteria({ rooms: 3, adults: 3 }),
    });
    await page.goto("/checkout");
    await expect(
      page.getByRole("heading", { level: 1, name: "Só 1 quarto disponível" }),
    ).toBeVisible();
  });

  test("quarto de outro hotel limpa a seleção e volta para `/`", async ({ page }) => {
    await seedSelection(page, { hotelId: 1, roomId: 45, criteria: criteria() });
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/\?notice=choose-room$/);
    const raw = await page.evaluate(() => sessionStorage.getItem("infotera:booking-draft"));
    expect(raw ?? "").not.toContain("roomId");
  });
});

test.describe("seções lentas ou com falha", () => {
  test("_delay no quarto: skeleton com aria-busy e o passo 1 já digitável", async ({
    page,
    slowApi,
  }) => {
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    await reroute(page, "**/rooms/1*", slowApi.url);
    await page.goto("/checkout");
    const holder = page.getByRole("group", { name: "Hóspede 1 · titular da reserva" });
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible();
    await expect(page.getByText("Calculando o total…")).toBeAttached();
    await holder.getByLabel("Nome", { exact: true }).fill("Ana");
    await expect(holder.getByLabel("Nome", { exact: true })).toHaveValue("Ana");
    await expect(page.getByRole("term").filter({ hasText: /^Total$/ })).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  });

  test("_fail no hotel: erro só no resumo; 'Tentar de novo' recupera sem perder o digitado", async ({
    page,
    failingApi,
  }) => {
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    const handler = await reroute(page, "**/hotels/1*", failingApi.url);
    await page.goto("/checkout");
    const holder = page.getByRole("group", { name: "Hóspede 1 · titular da reserva" });
    await holder.getByLabel("Nome", { exact: true }).fill("Ana");
    await expect(
      page.getByRole("heading", { name: "Não foi possível carregar os dados da reserva." }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Falha simulada")).toHaveCount(0);
    await expect(page.getByRole("term").filter({ hasText: /^Total$/ })).toBeVisible();

    await page.unroute("**/hotels/1*", handler);
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByText("Hotel Copacabana Palace")).toBeVisible();
    await expect(holder.getByLabel("Nome", { exact: true })).toHaveValue("Ana");
  });
});

test.describe("envio", () => {
  test.beforeEach(async ({ page }) => {
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    await page.goto("/checkout");
    await page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" }).waitFor();
    await goToReview(page, { companions: [{ first: "Bruno", last: "Souza" }] });
  });

  test("falha da action: alerta + toast, dados mantidos; 'Tentar de novo' cria uma só reserva", async ({
    page,
    request,
  }) => {
    const handler = (route: Route) => (isAction(route) ? route.abort() : route.fallback());
    await acceptTermsViaDialog(page);
    await page.route("**/checkout", handler);
    await clickPrimary(page, "Confirmar reserva");
    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível confirmar sua reserva" });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Nenhuma cobrança foi feita.");
    await expect(page.getByText("Não foi possível confirmar a reserva.")).toBeVisible();
    await expect(alert.locator("xpath=..")).toBeFocused();
    await expect(page.getByText("ana@exemplo.com")).toBeVisible();

    await page.unroute("**/checkout", handler);
    await alert.getByRole("button", { name: "Tentar de novo" }).click();
    await page.waitForURL(UUID_PATH);
    const id = page.url().split("/").pop() ?? "";
    const response = await request.get(`${API_URL}/bookings?id=${id}`);
    const found: unknown = await response.json();
    expect(Array.isArray(found) ? found : []).toHaveLength(1);
  });

  test("duplo envio: 3 cliques e Enter geram uma só chamada da action", async ({ page }) => {
    await acceptTermsViaDialog(page);
    const calls = actionRequests(page);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/checkout", async (route) => {
      if (!isAction(route)) return route.fallback();
      await gate;
      return route.continue();
    });
    const button = page.getByRole("button", { name: "Confirmar reserva", exact: true });
    await button.click();
    await expect(page.getByRole("button", { name: "Confirmando reserva…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await page.getByRole("button", { name: "Confirmando reserva…" }).click({ force: true });
    await page.getByRole("button", { name: "Confirmando reserva…" }).click({ force: true });
    await page.keyboard.press("Enter");
    release();
    await page.waitForURL(UUID_PATH);
    expect(calls).toHaveLength(1);
  });

  test("dois Enter rápidos no checkbox geram uma só chamada da action", async ({ page }) => {
    await acceptTermsViaDialog(page);
    // O dialog anima a saída antes de fechar (e devolver o foco): só depois o checkbox aceita foco.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const calls = actionRequests(page);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/checkout", async (route) => {
      if (!isAction(route)) return route.fallback();
      await gate;
      return route.continue();
    });
    await page.getByRole("checkbox", { name: /Li e aceito os termos/ }).focus();
    await Promise.all([page.keyboard.press("Enter"), page.keyboard.press("Enter")]);
    await expect(page.getByRole("button", { name: "Confirmando reserva…" })).toBeVisible();
    release();
    await page.waitForURL(UUID_PATH);
    expect(calls).toHaveLength(1);
  });

  test("sem aceitar os termos: erro no checkbox e no resumo, foco no checkbox", async ({
    page,
  }) => {
    await clickPrimary(page, "Confirmar reserva");
    const checkbox = page.getByRole("checkbox", { name: /Li e aceito os termos/ });
    await expect(checkbox).toBeFocused();
    await expect(checkbox).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert").filter({ hasText: "Corrija 1 campo" })).toContainText(
      "Termos: Para continuar, aceite os termos da reserva.",
    );
  });
});

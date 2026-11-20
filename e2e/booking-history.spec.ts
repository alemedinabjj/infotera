import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { HISTORY_KEY, noHorizontalScroll, readStorage } from "./extras";
import { analyzeAccessibility } from "./helpers/axe";
import { bookingPath, createBooking } from "./helpers/booking";
import { hotelName } from "./helpers/hotel-search";

// Histórico contra a mock-api real. Cada teste cria a própria reserva (POST direto, UUID v4) e
// abre a confirmação, que é quem grava o id no `localStorage`.

const idsInStorage = async (page: Page): Promise<string[]> => {
  const raw = await readStorage(page, HISTORY_KEY);
  return Array.isArray(raw) ? raw.map((item: { id: string }) => item.id) : [];
};

const seedHistory = (page: Page, ids: string[]) =>
  page.addInitScript(
    ({ key, list }) => {
      if (window.sessionStorage.getItem("seeded") === key) return;
      window.localStorage.setItem(
        key,
        JSON.stringify(
          list.map((id, index) => ({
            id,
            savedAt: new Date(Date.now() - index * 60_000).toISOString(),
          })),
        ),
      );
      window.sessionStorage.setItem("seeded", key);
    },
    { key: HISTORY_KEY, list: ids },
  );

test.describe("conteúdo", () => {
  test("pela confirmação e pelo header: reserva sem PII, com status e link", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await page.goto(bookingPath(id));
    await expect(page.getByRole("heading", { level: 1, name: "Reserva confirmada" })).toBeFocused();
    await page.getByRole("banner").getByRole("link", { name: "Minhas reservas" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Minhas reservas" })).toBeFocused();
    const name = await hotelName(request, 1);
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    const main = page.getByRole("main");
    await expect(main).toContainText("3 noites");
    await expect(main).toContainText("R$ 3.726,00");
    await expect(main).toContainText("Próxima estadia");
    await expect(main).toContainText(/Reservada em \d{2}\/\d{2}\/\d{4}/);
    await expect(main).not.toContainText(/Ana|Souza|ana\.souza|98765/);
    await expect(main).not.toContainText(id);
    await expect(page.getByRole("link", { name: `Ver reserva em ${name}` })).toHaveAttribute(
      "href",
      `/confirmation/${id}`,
    );
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });

  test("UUID inexistente: aviso, sai do storage; a reserva válida fica", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await seedHistory(page, [id, randomUUID()]);
    await page.goto("/my-bookings");
    await expect(page.getByText(/1 reserva não existe mais e saiu da lista/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(1);
    await expect.poll(() => idsInStorage(page)).toEqual([id]);
  });

  test("500 em uma reserva: só aquela linha com erro, retry recupera e o id continua guardado", async ({
    page,
    request,
  }) => {
    const ok = await createBooking(request);
    const flaky = await createBooking(request);
    await seedHistory(page, [ok, flaky]);
    let fail = true;
    await page.route(new RegExp(`/bookings/${flaky}`), (route) => {
      const url = new URL(route.request().url());
      if (fail) url.searchParams.set("_fail", "1");
      return route.continue({ url: url.toString() });
    });
    await page.goto("/my-bookings");
    await expect(page.getByText("Não foi possível carregar esta reserva.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(1);
    expect(await idsInStorage(page)).toEqual([ok, flaky]);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
    fail = false;
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(2);
    expect(await idsInStorage(page)).toEqual([ok, flaky]);
  });

  test("offline: só o aviso global (sem erro por linha) e storage intacto", async ({
    page,
    context,
    request,
  }) => {
    const id = await createBooking(request);
    await seedHistory(page, [id]);
    await page.route(new RegExp(`/bookings/${id}`), (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("_fail", "1");
      return route.continue({ url: url.toString() });
    });
    await page.goto("/my-bookings");
    await expect(page.getByText("Não foi possível carregar esta reserva.")).toBeVisible();
    await context.setOffline(true);
    // `exact`: o banner global ("Você está sem internet. Mostramos…") também contém a frase.
    await expect(page.getByText("Você está sem internet.", { exact: true })).toBeVisible();
    await expect(page.getByText("Não foi possível carregar esta reserva.")).toHaveCount(0);
    expect(await idsInStorage(page)).toEqual([id]);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
    await context.setOffline(false);
  });
});

test.describe("remover e limpar", () => {
  test("remover vira fantasma na mesma altura, foca Desfazer e desfazer volta na mesma posição", async ({
    page,
    request,
  }) => {
    const first = await createBooking(request);
    const second = await createBooking(request);
    await seedHistory(page, [first, second]);
    await page.goto("/my-bookings");
    const rows = page.locator("main ul > li");
    await expect(rows).toHaveCount(2);
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(2);
    const before = await rows.nth(0).boundingBox();
    const next = await rows.nth(1).boundingBox();
    await rows
      .nth(0)
      .getByRole("button", { name: /^Remover do histórico/ })
      .click();
    await expect(page.getByRole("button", { name: /^Desfazer/ })).toBeFocused();
    expect(await rows.nth(0).boundingBox()).toEqual(before);
    expect(await rows.nth(1).boundingBox()).toEqual(next);
    await page.getByRole("button", { name: /^Desfazer/ }).click();
    await expect.poll(() => idsInStorage(page)).toEqual([first, second]);
    await expect(rows.nth(0).getByRole("button", { name: /^Remover do histórico/ })).toBeFocused();
  });

  test("limpar: Esc devolve o foco, confirmar esvazia e foca o h1, Desfazer restaura", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await seedHistory(page, [id]);
    await page.goto("/my-bookings");
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    const open = page.getByRole("button", { name: "Limpar histórico" });
    await open.click();
    const dialog = page.getByRole("dialog", { name: "Limpar o histórico?" });
    await expect(dialog).toBeVisible();
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
    expect(await idsInStorage(page)).toEqual([id]);

    await open.click();
    await dialog.getByRole("button", { name: "Limpar histórico" }).click();
    await expect(
      page.getByRole("heading", { name: "Nenhuma reserva neste navegador" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(page.getByRole("status").getByText("Histórico apagado.")).toBeVisible();
    await page.getByRole("status").getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    expect(await idsInStorage(page)).toEqual([id]);
  });

  test("vazio: EmptyState, axe e 320 px sem rolagem horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/my-bookings");
    await expect(
      page.getByRole("heading", { name: "Nenhuma reserva neste navegador" }),
    ).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    expect((await analyzeAccessibility(page)).violations).toEqual([]);
  });
});

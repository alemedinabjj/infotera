import { expect, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { bookingPath, createControlledBooking } from "./helpers/booking";
import { API_URL } from "./helpers/hotel-search";
import { controlledHotel, hotelRequest, roomRequest, test } from "./helpers/server-api";

// Critérios 13 e 19 da F6: hotel e/ou quarto falham NO SERVIDOR (o proxy de controle responde 500;
// o `page.route` não vê esses requests). Hotel e quarto são exclusivos do worker.

const TITLES = {
  hotel: "Não foi possível carregar os dados do hotel.",
  room: "Não foi possível carregar os dados do quarto.",
  both: "Não foi possível carregar os dados do hotel e do quarto.",
} as const;

type Failing = keyof typeof TITLES;

const retryButton = (page: Page) => page.getByRole("button", { name: "Tentar de novo" });

/**
 * Espera a página terminar de chegar: o React streama a seção hotel/quarto num `<div hidden id="S:n">` e
 * só depois a move para o lugar (com um intervalo de reveal). Nesse meio tempo o mesmo texto existe duas
 * vezes no documento (modo estrito do Playwright) e um clique no "Tentar de novo" ainda não tem handler.
 * O botão de copiar é uma ilha do mesmo documento: ele aparecer prova a hidratação.
 */
const settled = async (page: Page) => {
  await page.getByRole("button", { name: "Copiar número da reserva" }).waitFor();
  await expect(page.locator('div[hidden][id^="S:"]')).toHaveCount(0);
};

const nameOf = async (page: Page, path: string): Promise<string> => {
  const body: unknown = await (await page.request.get(`${API_URL}${path}`)).json();
  if (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof body.name === "string"
  ) {
    return body.name;
  }
  throw new Error(`${path} sem nome`);
};

test.describe("hotel e quarto falham no servidor (critérios 13 e 19)", () => {
  const setup = async (
    {
      page,
      request,
      serverApi,
    }: Pick<Parameters<Parameters<typeof test>[2]>[0], "page" | "request" | "serverApi">,
    parallelIndex: number,
    failing: Failing,
  ) => {
    const hotelId = controlledHotel(parallelIndex);
    const { id, roomId } = await createControlledBooking(request, hotelId);
    // Os nomes vêm da mock-api ANTES de as regras de falha entrarem no proxy.
    const names = {
      hotel: await nameOf(page, `/hotels/${hotelId}`),
      room: await nameOf(page, `/rooms/${roomId}`),
    };
    if (failing !== "room") await serverApi.failServerRequests(hotelRequest(hotelId));
    if (failing !== "hotel") await serverApi.failServerRequests(roomRequest(roomId));
    await page.goto(bookingPath(id));
    await settled(page);
    return { hotelId, roomId, names };
  };

  for (const failing of ["hotel", "room", "both"] as const) {
    test(`falha só ${failing === "both" ? "dos dois" : `do ${failing}`}: um erro de seção; a reserva segue confirmada`, async ({
      page,
      request,
      serverApi,
    }, testInfo) => {
      const { names } = await setup({ page, request, serverApi }, testInfo.parallelIndex, failing);
      await expect(
        page.getByRole("heading", { level: 1, name: "Reserva confirmada" }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { level: 3, name: TITLES[failing] })).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 3, name: /^Não foi possível carregar/ }),
      ).toHaveCount(1);
      await expect(retryButton(page)).toHaveCount(1);
      await expect(page.getByText("Sua reserva está confirmada.")).toBeVisible();
      await expect(page.getByText("Falha simulada")).toHaveCount(0);
      // O que carregou aparece abaixo do erro, normalmente.
      if (failing === "room") {
        await expect(page.getByRole("heading", { level: 3, name: names.hotel })).toBeVisible();
      }
      if (failing === "hotel") {
        await expect(page.getByText(names.room).first()).toBeVisible();
      }
    });
  }

  test("retry: falha de novo e o botão continua; no sucesso o foco vai ao h2 'Sua estadia'", async ({
    page,
    request,
    serverApi,
  }, testInfo) => {
    const { names } = await setup({ page, request, serverApi }, testInfo.parallelIndex, "both");
    await expect(retryButton(page)).toBeVisible();

    await retryButton(page).click();
    await expect(page.getByRole("heading", { level: 3, name: TITLES.both })).toBeVisible();
    await expect(retryButton(page)).toBeVisible();
    await expect(retryButton(page)).toBeEnabled();

    await serverApi.reset();
    await retryButton(page).click();
    await expect(page.getByRole("heading", { level: 3, name: names.hotel })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: /^Não foi possível carregar/ }),
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "Sua estadia" })).toBeFocused();
  });

  test("retry com o servidor demorando: 'Tentando…' com aria-busy e o foco no botão", async ({
    page,
    request,
    serverApi,
  }, testInfo) => {
    const { hotelId, roomId } = await setup(
      { page, request, serverApi },
      testInfo.parallelIndex,
      "both",
    );
    await serverApi.reset();
    const hotel = await serverApi.holdServerRequests(hotelRequest(hotelId));
    const room = await serverApi.holdServerRequests(roomRequest(roomId));
    await retryButton(page).click();
    await Promise.all([hotel.waitForHit(), room.waitForHit()]);
    const busy = page.getByRole("button", { name: "Tentando…" });
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(busy).toBeFocused();
    await Promise.all([serverApi.release(hotel), serverApi.release(room)]);
    await expect(page.getByRole("heading", { level: 2, name: "Sua estadia" })).toBeFocused();
  });

  for (const failing of ["hotel", "room", "both"] as const) {
    test(`axe sem violações no erro de seção (${failing})`, async ({
      page,
      request,
      serverApi,
    }, testInfo) => {
      await setup({ page, request, serverApi }, testInfo.parallelIndex, failing);
      await expect(page.getByRole("heading", { level: 3, name: TITLES[failing] })).toBeVisible();
      const results = await analyzeAccessibility(page);
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
      ).toEqual([]);
    });
  }
});

import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { bookingPath, createBooking, README_FORMAT_BOOKING } from "./helpers/booking";
import { noHorizontalScroll } from "./helpers/hotel-details";

// Mock-api real. Reservas forjadas por `POST` direto (a API não valida nada): hotel inexistente,
// quarto de outro hotel, total adulterado e corpo fora do contrato são cenários reais.
// `_delay`/`_fail` não se aplicam: o servidor do Next faz esses requests, e `page.route` não os vê.

const expectNoViolations = async (page: Page) => {
  const results = await analyzeAccessibility(page);
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
  ).toEqual([]);
};

const NOT_FOUND = { level: 1, name: "Reserva não encontrada" } as const;

const waitForHydration = (page: Page) =>
  page.getByRole("button", { name: "Copiar número da reserva" }).waitFor();

test.describe("reserva não encontrada (critérios 7, 8 e 9)", () => {
  test("UUID v4 inexistente: h1, texto, link e noindex", async ({ page }) => {
    await page.goto(bookingPath(randomUUID()));
    await expect(page.getByRole("heading", NOT_FOUND)).toBeFocused();
    await expect(
      page.getByText(
        "Confira o número da reserva no link. Reservas de teste são apagadas quando o sistema reinicia.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute("href", "/");
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
    await expect(page).toHaveTitle("Reserva não encontrada | Infotera Hotéis");
  });

  for (const raw of ["abc", "1", "00000000-0000-1000-8000-000000000000", "%252e%252e"]) {
    test(`id fora do formato ${raw}: não encontrada`, async ({ page }) => {
      await page.goto(`/confirmation/${raw}`);
      await expect(page.getByRole("heading", NOT_FOUND)).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    });
  }

  test("o id numérico de uma reserva real não abre (sem enumeração)", async ({ page, request }) => {
    const id = await createBooking(request);
    await page.goto("/confirmation/1");
    await expect(page.getByRole("heading", NOT_FOUND)).toBeVisible();
    await expect(page.getByText(id)).toHaveCount(0);
  });

  test("UUID em maiúsculas abre normalmente, com o número em minúsculas", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await page.goto(bookingPath(id.toUpperCase()));
    await expect(page.getByRole("heading", { level: 1, name: "Reserva confirmada" })).toBeVisible();
    await expect(page.getByText(id, { exact: true })).toBeVisible();
  });
});

test.describe("degradação parcial (critérios 11, 12, 14 e 15)", () => {
  test("formato do README: só contagem e total, sem titular, e-mail, cartão nem detalhamento", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request, {}, README_FORMAT_BOOKING);
    await page.goto(bookingPath(id));
    await expect(page.getByRole("heading", { level: 1, name: "Reserva confirmada" })).toBeVisible();
    await expect(page.getByText(/Enviamos os detalhes/)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "Hóspedes" })).toHaveCount(0);
    await expect(page.getByText(/Cartão final/)).toHaveCount(0);
    await expect(page.getByText(/Taxa de serviço|ISS|Impostos e taxas/)).toHaveCount(0);
    const payment = page.getByRole("region", { name: "Pagamento" });
    await expect(payment).toContainText("Pagamento simulado: nenhum valor foi cobrado.");
    await expect(payment).toContainText("TotalR$ 3.600,00");
    await expect(page.getByRole("region", { name: "Sua estadia" })).toContainText(
      "3 noites · 2 adultos · 1 quarto",
    );
  });

  test("hotel inexistente: Hotel #id, aviso e horários a confirmar, sem retry", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request, { hotelId: 9999 });
    await page.goto(bookingPath(id));
    const stay = page.getByRole("region", { name: "Sua estadia" });
    await expect(stay.getByRole("heading", { level: 3, name: "Hotel #9999" })).toBeVisible();
    await expect(stay).toContainText("Os dados deste hotel não estão mais disponíveis.");
    await expect(stay).toContainText("Confirme com o hotel");
    await expect(stay.getByRole("link", { name: /Ver página do hotel/ })).toHaveCount(0);
    await expect(stay.getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Pagamento" })).toContainText("TotalR$ 3.726,00");
  });

  test("quarto de outro hotel (reserva forjada): Quarto #id com aviso", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request, { roomId: 3 });
    await page.goto(bookingPath(id));
    const stay = page.getByRole("region", { name: "Sua estadia" });
    await expect(stay).toContainText("Quarto #3");
    await expect(stay).toContainText("Os dados deste quarto não estão mais disponíveis.");
    await expect(
      stay.getByRole("heading", { level: 3, name: "Hotel Copacabana Palace" }),
    ).toBeVisible();
  });

  test("total adulterado: só o totalPrice, sem detalhamento", async ({ page, request }) => {
    const id = await createBooking(request, { totalPrice: 100 });
    await page.goto(bookingPath(id));
    const payment = page.getByRole("region", { name: "Pagamento" });
    await expect(payment).toContainText("TotalR$ 100,00");
    await expect(payment).not.toContainText("ISS");
    await expect(payment).not.toContainText("Impostos e taxas");
  });

  test("corpo fora do contrato: não foi possível exibir, sem retry", async ({ page, request }) => {
    const id = await createBooking(request, { hotelId: "não é número" });
    await page.goto(bookingPath(id));
    await expect(
      page.getByRole("heading", { level: 1, name: "Não foi possível exibir esta reserva" }),
    ).toBeFocused();
    await expect(page.getByRole("button", { name: /Tentar de novo/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Fazer nova busca" })).toBeVisible();
    await expect(page).toHaveTitle("Reserva indisponível | Infotera Hotéis");
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });
});

test.describe("acessibilidade (critérios 19 e 20)", () => {
  test("axe sem violações em sucesso, não encontrada, ilegível e hotel indisponível", async ({
    page,
    request,
  }) => {
    const ok = await createBooking(request);
    await page.goto(bookingPath(ok));
    await expect(
      page.getByRole("heading", { level: 3, name: "Hotel Copacabana Palace" }),
    ).toBeVisible();
    await expectNoViolations(page);

    await page.goto(bookingPath(randomUUID()));
    await expect(page.getByRole("heading", NOT_FOUND)).toBeVisible();
    await expectNoViolations(page);

    await page.goto(bookingPath(await createBooking(request, { hotelId: "x" })));
    await expect(
      page.getByRole("heading", { level: 1, name: /Não foi possível exibir/ }),
    ).toBeVisible();
    await expectNoViolations(page);

    await page.goto(bookingPath(await createBooking(request, { hotelId: 9999 })));
    await expect(page.getByRole("heading", { level: 3, name: "Hotel #9999" })).toBeVisible();
    await expectNoViolations(page);
  });

  test("hierarquia: um h1, h2 nas seções e h3 no hotel e no cancelamento", async ({
    page,
    request,
  }) => {
    await page.goto(bookingPath(await createBooking(request)));
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Sua estadia",
      "Hóspedes",
      "Pagamento",
      "Próximos passos",
    ]);
    await expect(page.getByRole("heading", { level: 3 })).toHaveText([
      "Hotel Copacabana Palace",
      "Cancelamento",
    ]);
  });

  test("só com o teclado: Copiar número, Ver página do hotel e Fazer nova busca, com foco visível", async ({
    page,
    request,
  }) => {
    await page.goto(bookingPath(await createBooking(request)));
    const heading = page.getByRole("heading", { level: 1, name: "Reserva confirmada" });
    await expect(heading).toBeFocused();
    const hotelLink = page.getByRole("link", { name: /Ver página do hotel/ });
    await expect(hotelLink).toBeVisible();
    await waitForHydration(page);

    const order = [
      page.getByRole("button", { name: "Copiar número da reserva" }),
      hotelLink,
      page.getByRole("link", { name: "Fazer nova busca" }),
    ];
    for (const target of order) {
      await page.keyboard.press("Tab");
      await expect(target).toBeFocused();
      const outline = await target.evaluate((el) => getComputedStyle(el).outlineStyle);
      expect(outline).not.toBe("none");
    }
  });
});

const LONG = "a".repeat(60);

/** Linhas do número: cada quebra tem que cair logo depois de um hífen. */
const numberLines = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const node = document.getElementById("numero-reserva");
    const text = node?.firstChild ? node : null;
    if (!text) return [];
    const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
    const lines = new Map<number, string>();
    for (let current = walker.nextNode(); current; current = walker.nextNode()) {
      const value = current.textContent ?? "";
      for (let index = 0; index < value.length; index += 1) {
        const range = document.createRange();
        range.setStart(current, index);
        range.setEnd(current, index + 1);
        const top = Math.round(range.getBoundingClientRect().top);
        lines.set(top, (lines.get(top) ?? "") + value.charAt(index));
      }
    }
    return [...lines.entries()].sort(([a], [b]) => a - b).map(([, line]) => line);
  });

test.describe("320 px (critérios 21 e 22)", () => {
  test.use({ viewport: { width: 320, height: 720 } });

  test("sem rolagem horizontal, mesmo com e-mail, nome e total longos", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request, {
      guests: [
        { firstName: LONG, lastName: LONG, email: `${LONG}@${LONG}.com`, kind: "adult" },
        { firstName: LONG, lastName: LONG, kind: "adult" },
      ],
      priceBreakdown: undefined,
      totalPrice: 300000,
      payment: { method: "credit_card", cardLast4: "1111" },
    });
    await page.goto(bookingPath(id));
    await expect(page.getByRole("region", { name: "Pagamento" })).toContainText(
      "TotalR$ 300.000,00",
    );
    await expect(
      page.getByRole("heading", { level: 3, name: "Hotel Copacabana Palace" }),
    ).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("sem rolagem horizontal nos estados de página", async ({ page, request }) => {
    await page.goto(bookingPath(randomUUID()));
    await expect(page.getByRole("heading", NOT_FOUND)).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    await page.goto(bookingPath(await createBooking(request, { hotelId: "x" })));
    await expect(
      page.getByRole("heading", { level: 1, name: /Não foi possível exibir/ }),
    ).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    await page.goto(bookingPath(await createBooking(request, { hotelId: 9999 })));
    await expect(page.getByRole("heading", { level: 3, name: "Hotel #9999" })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("o número quebra só depois de hífen e o texto copiado é o UUID", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await page.goto(bookingPath(id));
    await expect(page.getByText(id)).toBeVisible();
    const lines = await numberLines(page);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe(id);
    for (const line of lines.slice(0, -1)) expect(line.endsWith("-")).toBe(true);
    expect(await page.getByText(id).textContent()).toBe(id);
  });
});

test.describe("impressão (critério 23)", () => {
  test("header, copiar e nova busca somem; número, datas e total ficam", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await page.goto(bookingPath(id));
    await expect(
      page.getByRole("heading", { level: 3, name: "Hotel Copacabana Palace" }),
    ).toBeVisible();
    await waitForHydration(page);
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("button", { name: "Copiar número da reserva" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Fazer nova busca" })).toBeHidden();
    await expect(page.getByRole("link", { name: /Ver página do hotel/ })).toBeHidden();
    await expect(page.getByText(id)).toBeVisible();
    await expect(page.getByText("Check-in", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Pagamento" })).toContainText("TotalR$ 3.726,00");
    await expect(page.getByText("Cancele grátis até 48 horas antes do check-in.")).toBeVisible();
  });
});

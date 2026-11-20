import { expect, type Page, test } from "@playwright/test";
import { formatDate } from "../src/shared/lib/dates";
import { bookingPath, createBooking } from "./helpers/booking";
import { criteria, seedSelection } from "./helpers/checkout";
import { API_URL, CHECK_IN, CHECK_OUT, hotelName } from "./helpers/hotel-search";

// Mock-api real. Cada teste cria a própria reserva por `POST` direto (UUID v4, formato da F5): o
// servidor do Next é quem lê, então `page.route` não enxerga esses requests.
// Hotel 1 (Copacabana Palace), quarto 1 (Suíte Deluxe Ocean View, 1 cama king, R$ 1.200).

const HISTORY_KEY = "infotera:booking-history";

const roomName = async (request: Parameters<typeof hotelName>[0], id: number): Promise<string> => {
  const body: unknown = await (await request.get(`${API_URL}/rooms/${id}`)).json();
  if (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof body.name === "string"
  ) {
    return body.name;
  }
  throw new Error(`quarto ${id} sem nome`);
};

/** O botão de copiar só existe depois da hidratação: serve de sinal de "página interativa". */
const waitForHydration = (page: Page) =>
  page.getByRole("button", { name: "Copiar número da reserva" }).waitFor();

const readHistory = (page: Page): Promise<{ id: string; savedAt: string }[]> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]"), HISTORY_KEY);

test.describe("conteúdo (critérios 1, 2, 3 e 5)", () => {
  test("recibo completo, com foco no h1 e o breakdown do checkout", async ({ page, request }) => {
    const id = await createBooking(request);
    await page.goto(bookingPath(id));

    const heading = page.getByRole("heading", { level: 1, name: "Reserva confirmada" });
    await expect(heading).toBeFocused();
    await expect(page.getByText("Enviamos os detalhes para ana.souza@exemplo.com.")).toBeVisible();
    await expect(
      page.getByText(/Reserva feita em \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2} \(horário de Brasília\)/),
    ).toBeVisible();
    await expect(page.getByText(id)).toBeVisible();

    const stay = page.getByRole("region", { name: "Sua estadia" });
    await expect(
      stay.getByRole("heading", { level: 3, name: await hotelName(request, 1) }),
    ).toBeVisible();
    await expect(stay).toContainText("Av. Atlântica");
    await expect(stay).toContainText(await roomName(request, 1));
    await expect(stay).toContainText("1 cama king");
    await expect(stay).toContainText(formatDate(CHECK_IN, "long"));
    await expect(stay).toContainText(formatDate(CHECK_OUT, "long"));
    await expect(stay).toContainText("A partir de 15:00");
    await expect(stay).toContainText("Até 12:00");
    await expect(stay).toContainText("3 noites · 2 adultos, 1 criança · 1 quarto");
    await expect(stay.getByRole("link", { name: /Ver página do hotel/ })).toHaveAttribute(
      "href",
      "/hotel/1",
    );

    const guests = page.getByRole("region", { name: "Hóspedes" });
    await expect(guests).toContainText("Ana Souza · titular");
    await expect(guests).toContainText("Bruno Souza · adulto");
    await expect(guests).toContainText("Clara Souza · criança");

    const payment = page.getByRole("region", { name: "Pagamento" });
    await expect(payment).toContainText("Cartão final 1111");
    await expect(payment).toContainText("R$ 1.200,00 × 3 noites × 1 quarto");
    await expect(payment).toContainText("R$ 3.600,00");
    await expect(payment).toContainText("Desconto (BEMVINDO10)−R$ 360,00");
    await expect(payment).toContainText("Taxa de serviço (10%)R$ 324,00");
    await expect(payment).toContainText("ISS (5%)R$ 162,00");
    await expect(payment).toContainText("TotalR$ 3.726,00");
    await expect(payment).toContainText("Impostos e taxas incluídos.");
    await expect(page.getByRole("region", { name: "Próximos passos" })).toBeVisible();
  });

  test("recarregar e abrir em outra aba mostram o mesmo conteúdo, sem sessionStorage", async ({
    page,
    context,
    request,
  }) => {
    const id = await createBooking(request);
    await page.goto(bookingPath(id));
    await expect(page.getByText(id)).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Reserva confirmada" })).toBeVisible();
    await expect(page.getByText(id)).toBeVisible();
    await expect(page.getByRole("region", { name: "Pagamento" })).toContainText("TotalR$ 3.726,00");

    const other = await context.newPage();
    await other.goto(bookingPath(id));
    await expect(
      other.getByRole("heading", { level: 1, name: "Reserva confirmada" }),
    ).toBeVisible();
    await expect(other.getByText(id)).toBeVisible();
    expect(await other.evaluate(() => sessionStorage.getItem("infotera:booking-draft"))).toBeNull();
    await expect(other.getByRole("region", { name: "Pagamento" })).toContainText(
      "TotalR$ 3.726,00",
    );
  });

  test("o HTML vem do servidor com o número e o total, sem cache e sem indexação", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    const response = await page.goto(bookingPath(id));
    if (!response) throw new Error("sem resposta");
    expect(response.headers()["cache-control"]).toContain("no-store");
    const html = await response.text();
    expect(html).toContain(id);
    expect(html).toContain("3.726,00");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /nofollow/);
    await expect(page).toHaveTitle("Reserva confirmada | Infotera Hotéis");
  });

  test("nada de telefone, idade, documento ou número do cartão na tela nem no título", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await page.goto(bookingPath(id));
    await expect(page.getByRole("region", { name: "Hóspedes" })).toBeVisible();
    const content = await page.content();
    expect(content).not.toContain("98765");
    expect(content).not.toContain("(11)");
    expect(content).not.toMatch(/7 anos|idade/i);
    expect(content).not.toMatch(/4111|CPF|\d{3}\.\d{3}\.\d{3}-\d{2}/);
    const title = await page.title();
    expect(title).not.toContain("Ana");
    expect(title).not.toContain("exemplo.com");
    expect(title).not.toContain(id);
  });
});

test.describe("ações (critérios 16, 17 e 18)", () => {
  test("copiar o número: o clipboard recebe exatamente o UUID e o botão mostra Copiado", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const id = await createBooking(request);
    await page.goto(bookingPath(id));
    const button = page.getByRole("button", { name: "Copiar número da reserva" });
    await button.click();
    await expect(page.getByRole("button", { name: "Copiado" })).toBeFocused();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(id);
    await expect(page.getByText("Número da reserva copiado.")).toBeAttached();
    await expect(button).toBeVisible();
  });

  test("Nova busca leva para / e limpa a seleção do booking-draft", async ({ page, request }) => {
    await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
    const id = await createBooking(request);
    await page.goto(bookingPath(id));
    await waitForHydration(page);
    expect(
      await page.evaluate(() => sessionStorage.getItem("infotera:booking-draft")),
    ).not.toBeNull();

    await page.getByRole("link", { name: "Fazer nova busca" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => sessionStorage.getItem("infotera:booking-draft"))).toBeNull();
  });

  test("o histórico guarda só { id, savedAt } e o reload não duplica", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await page.goto(bookingPath(id));
    await waitForHydration(page);
    await expect.poll(() => readHistory(page)).toHaveLength(1);
    const [entry] = await readHistory(page);
    expect(Object.keys(entry ?? {}).sort()).toEqual(["id", "savedAt"]);
    expect(entry?.id).toBe(id);

    await page.reload();
    await waitForHydration(page);
    const after = await readHistory(page);
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe(id);
    const raw = await page.evaluate((key) => localStorage.getItem(key), HISTORY_KEY);
    expect(raw).not.toMatch(/Ana|exemplo|3726|Copacabana/);
  });
});

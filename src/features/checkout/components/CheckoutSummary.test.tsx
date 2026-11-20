import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeHotel, makeRoom } from "@/shared/testing/fixtures";
import { navigationSpies } from "@/shared/testing/next-navigation";
import {
  happyApi,
  jsonResponse,
  makeSelection,
  plain,
  renderCheckout,
  seedSelection,
  stubApi,
  stubLoadedDocument,
} from "./checkout-test-utils";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);
vi.mock("../api/create-booking.action", () => ({ createBookingAction: vi.fn() }));

beforeEach(async () => {
  navigationSpies.replace.mockClear();
  stubLoadedDocument();
  await seedSelection(makeSelection());
});
afterEach(() => vi.unstubAllGlobals());

const summary = () => screen.getByRole("region", { name: "Sua reserva" });

describe("resumo (critério 7)", () => {
  it("hotel, quarto, datas, noites, hóspedes, horários, cancelamento e endereço", async () => {
    happyApi();
    renderCheckout();
    expect(await screen.findByText("Hotel Copacabana Palace")).toBeVisible();
    const region = summary();
    expect(region).toHaveTextContent("Suíte Deluxe");
    expect(region).toHaveTextContent("3 noites");
    expect(region).toHaveTextContent("1 adulto · 1 quarto");
    expect(region).toHaveTextContent("Cancelamento grátis");
    expect(region).toHaveTextContent("Av. Atlântica, 1702");
    expect(region).toHaveTextContent("A partir de 15:00");
    expect(region).toHaveTextContent("Até 12:00");
    expect(within(region).getByRole("link", { name: "Alterar datas e hóspedes" })).toHaveAttribute(
      "href",
      expect.stringContaining("/hotel/1?"),
    );
  });
});

describe("preço (critério 10)", () => {
  it("1 quarto × 3 noites a R$ 1.200: estadia, taxa, ISS e total", async () => {
    happyApi();
    renderCheckout();
    await screen.findByText("Hotel Copacabana Palace");
    const text = plain(summary().textContent);
    expect(text).toContain("R$ 1.200,00 × 3 noites × 1 quarto");
    expect(text).toContain("R$ 3.600,00");
    expect(text).toContain("Taxa de serviço (10%)R$ 360,00");
    expect(text).toContain("ISS (5%)R$ 180,00");
    expect(text).toContain("TotalR$ 4.140,00");
    expect(text).toContain("Impostos e taxas incluídos.");
  });
});

describe("carregando por seção (critério 8)", () => {
  it("quarto pendente: skeleton aria-busy, 'Calculando o total…' e o passo 1 já digitável", async () => {
    const user = userEvent.setup();
    stubApi({ "/hotels/1": makeHotel(), "/rooms/1": () => new Promise<Response>(() => undefined) });
    renderCheckout();
    const name = await screen.findByLabelText("Nome");
    await user.type(name, "Ana");
    expect(name).toHaveValue("Ana");
    expect(summary().querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText("Calculando o total…")).toBeInTheDocument();
  });
});

describe("erro por seção (critério 9)", () => {
  it("erro do quarto: só o preço mostra erro; 'Tentar de novo' recupera e o digitado fica", async () => {
    const user = userEvent.setup();
    let failing = true;
    stubApi({
      "/hotels/1": makeHotel(),
      "/rooms/1": () => (failing ? new Response("{}", { status: 500 }) : jsonResponse(makeRoom())),
    });
    renderCheckout();
    await user.type(await screen.findByLabelText("Nome"), "Ana");
    expect(
      await screen.findByRole("heading", {
        name: "Não foi possível carregar os dados da reserva.",
      }),
    ).toBeVisible();
    expect(screen.queryByText("Quarto indisponível no momento")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Tentar de novo" })).toHaveLength(1);
    expect(screen.getAllByText("Total não carregado — tente de novo")).toHaveLength(2);
    failing = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(plain(summary().textContent)).toContain("TotalR$ 4.140,00"));
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
    expect(screen.queryByText("Total não carregado — tente de novo")).not.toBeInTheDocument();
  });

  it("erro do hotel: só o topo do resumo mostra erro; datas e preço seguem", async () => {
    const user = userEvent.setup();
    let failing = true;
    stubApi({
      "/hotels/1": () =>
        failing ? new Response("{}", { status: 500 }) : jsonResponse(makeHotel()),
      "/rooms/1": makeRoom(),
    });
    renderCheckout();
    expect(
      await screen.findByRole("heading", {
        name: "Não foi possível carregar os dados da reserva.",
      }),
    ).toBeVisible();
    expect(plain(summary().textContent)).toContain("TotalR$ 4.140,00");
    expect(plain(summary().textContent)).toContain("3 noites");
    failing = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Hotel Copacabana Palace")).toBeVisible();
  });
});

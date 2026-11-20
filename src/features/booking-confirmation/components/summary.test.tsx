import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeBooking } from "@/shared/testing/fixtures";
import { toBookingView } from "../model/confirmation-view";
import { ConfirmationHeader } from "./ConfirmationHeader";
import { GuestList } from "./GuestList";
import { NextSteps } from "./NextSteps";
import { PaymentSummary } from "./PaymentSummary";
import { UnreadableBooking } from "./UnreadableBooking";

const plain = (value: string | null) => (value ?? "").replaceAll(" ", " ");
const viewOf = (overrides = {}) => toBookingView(makeBooking(overrides), "2026-11-19");

describe("ConfirmationHeader", () => {
  it("h1 com foco, frase do e-mail e data em horário de Brasília", () => {
    const view = viewOf();
    render(<ConfirmationHeader email={view.guests.holderEmail} bookedAt={view.bookedAt} />);
    const heading = screen.getByRole("heading", { level: 1, name: "Reserva confirmada" });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText(/Enviamos os detalhes para/)).toHaveTextContent(
      "Enviamos os detalhes para a***@exemplo.com.",
    );
    expect(
      screen.getByText("Reserva feita em 19/11/2026, 12:04 (horário de Brasília)"),
    ).toBeVisible();
  });

  it("sem titular não há frase de e-mail", () => {
    render(<ConfirmationHeader email={null} bookedAt="19/11/2026, 12:04" />);
    expect(screen.queryByText(/Enviamos os detalhes/)).not.toBeInTheDocument();
  });
});

describe("GuestList", () => {
  it("titular e acompanhantes com o tipo, sem idade nem telefone (critério 5)", () => {
    const { container } = render(<GuestList guests={viewOf().guests.lines} />);
    expect(screen.getByRole("heading", { level: 2, name: "Hóspedes" })).toBeVisible();
    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["Ana Souza · titular", "Bruno Souza · adulto", "Clara Souza · criança"]);
    expect(container.textContent).not.toMatch(/98765|7 anos|idade/);
  });
});

describe("PaymentSummary", () => {
  it("cartão final, aviso de simulação e o detalhamento do checkout (critério 1)", () => {
    const view = viewOf();
    render(<PaymentSummary cardLast4={view.cardLast4} price={view.price} />);
    const region = screen.getByRole("region", { name: "Pagamento" });
    const text = plain(region.textContent);
    expect(text).toContain("Cartão final 1111");
    expect(text).toContain("Pagamento simulado: nenhum valor foi cobrado.");
    expect(text).toContain("R$ 1.200,00 × 3 noites × 1 quarto");
    expect(text).toContain("R$ 3.600,00");
    expect(text).toContain("Desconto (BEMVINDO10)−R$ 360,00");
    expect(text).toContain("Taxa de serviço (10%)R$ 324,00");
    expect(text).toContain("ISS (5%)R$ 162,00");
    expect(text).toContain("TotalR$ 3.726,00");
    expect(text).toContain("Impostos e taxas incluídos.");
  });

  it("formato do README: sem cartão e só o total, sem a nota (critério 14)", () => {
    const view = viewOf({ payment: undefined, priceBreakdown: undefined, totalPrice: 4140 });
    render(<PaymentSummary cardLast4={view.cardLast4} price={view.price} />);
    const text = plain(screen.getByRole("region", { name: "Pagamento" }).textContent);
    expect(text).not.toContain("Cartão final");
    expect(text).toContain("Pagamento simulado: nenhum valor foi cobrado.");
    expect(text).toContain("TotalR$ 4.140,00");
    expect(text).not.toContain("Taxa de serviço");
    expect(text).not.toContain("Impostos e taxas incluídos.");
  });

  it("breakdown inconsistente mostra só o totalPrice (critério 15)", () => {
    const { priceBreakdown } = makeBooking();
    if (!priceBreakdown) throw new Error("fixture sem breakdown");
    const view = viewOf({ priceBreakdown: { ...priceBreakdown, taxCents: 1 } });
    render(<PaymentSummary cardLast4={view.cardLast4} price={view.price} />);
    const text = plain(screen.getByRole("region", { name: "Pagamento" }).textContent);
    expect(text).toContain("TotalR$ 3.726,00");
    expect(text).not.toContain("ISS");
  });
});

describe("NextSteps", () => {
  it("lista ordenada com a orientação de privacidade do link", () => {
    render(<NextSteps />);
    const region = screen.getByRole("region", { name: "Próximos passos" });
    const steps = within(region).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[2]).toHaveTextContent(
      "Não compartilhe o link desta página: quem tiver o link vê os dados da reserva.",
    );
  });
});

describe("UnreadableBooking (critério 11)", () => {
  it("h1, texto do design system, sem retry e com Fazer nova busca", () => {
    render(<UnreadableBooking />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Não foi possível exibir esta reserva" }),
    ).toHaveFocus();
    expect(
      screen.getByText(
        "Os dados desta reserva estão incompletos. Tentar de novo não resolve: faça uma nova busca.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Tentar de novo/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute("href", "/");
  });
});

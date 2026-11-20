import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CheckoutPrice } from "../hooks/checkout-price";
import { calculatePrice } from "../model/price";
import { PriceBreakdown } from "./PriceBreakdown";

const baseQuote = calculatePrice({ pricePerNight: 1200, nights: 3, rooms: 1 });
const ready: CheckoutPrice = {
  status: "ready",
  nights: 3,
  result: { quote: baseQuote, baseQuote, coupon: { state: "none" } },
};

describe("PriceBreakdown: cupom em validação", () => {
  it("mostra o skeleton do desconto logo depois da estadia, escondido do leitor de tela", () => {
    const { container } = render(<PriceBreakdown price={ready} couponValidating />);
    const rows = [...(container.querySelector("dl")?.children ?? [])];
    expect(rows.findIndex((row) => row.getAttribute("aria-hidden") === "true")).toBe(1);
    expect(rows[0]).toHaveTextContent("1 quarto");
    expect(rows[2]).toHaveTextContent("Taxa de serviço (10%)");
    expect(screen.queryByText(/Desconto/)).not.toBeInTheDocument();
  });

  it("sem validação em andamento não há skeleton do desconto", () => {
    const { container } = render(<PriceBreakdown price={ready} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    // estadia, taxa de serviço e ISS; o total mora no bloco seguinte (com a nota de impostos).
    expect(container.querySelector("dl")?.children).toHaveLength(3);
  });
});

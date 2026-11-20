import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { priceBreakdownLines } from "../../lib/price-breakdown";
import { PriceBreakdown } from "./PriceBreakdown";

/** Exemplo da F5: R$ 1.200 × 3 noites × 1 quarto com BEMVINDO10. */
const calculateTestLines = () => {
  const breakdown = {
    nightlyCents: 120000,
    nights: 3,
    rooms: 1,
    subtotalCents: 360000,
    discountCents: 36000,
    serviceFeeCents: 32400,
    taxCents: 16200,
    totalCents: 372600,
    couponCode: "BEMVINDO10",
  };
  return { lines: priceBreakdownLines(breakdown), totalCents: breakdown.totalCents };
};

const plain = (value: string | null) => (value ?? "").replaceAll(" ", " ");

describe("PriceBreakdown", () => {
  it("mostra linhas, desconto com sinal, total e a nota", () => {
    const { lines, totalCents } = calculateTestLines();
    const { container } = render(
      <PriceBreakdown locale="pt-BR" lines={lines} totalCents={totalCents} />,
    );
    const text = plain(container.textContent);
    expect(text).toContain("R$ 1.200,00 × 3 noites × 1 quarto");
    expect(text).toContain("Desconto (BEMVINDO10)−R$ 360,00");
    expect(text).toContain("Taxa de serviço (10%)R$ 324,00");
    expect(text).toContain("ISS (5%)R$ 162,00");
    expect(text).toContain("TotalR$ 3.726,00");
    expect(screen.getByText("Impostos e taxas incluídos.")).toBeVisible();
  });

  it("sem linhas mostra só o total e sem a nota quando pedido", () => {
    const { container } = render(
      <PriceBreakdown locale="pt-BR" lines={[]} totalCents={372600} showTaxNote={false} />,
    );
    expect(plain(container.textContent)).toBe("TotalR$ 3.726,00");
  });

  it("encaixa o conteúdo extra depois da estadia", () => {
    const { lines, totalCents } = calculateTestLines();
    render(
      <PriceBreakdown
        locale="pt-BR"
        lines={lines}
        totalCents={totalCents}
        afterStay={<div data-testid="extra" />}
      />,
    );
    const extra = screen.getByTestId("extra");
    expect(extra.previousElementSibling?.textContent).toContain("noites");
  });
});

import { describe, expect, it } from "vitest";
import { describeCouponTransition } from "./coupon-announcement";

const none = { kind: "none" } as const;
const valid = { kind: "valid", code: "DESCONTO50" } as const;
const ineligible = {
  kind: "ineligible",
  code: "DESCONTO50",
  message: "Válido para reservas a partir de R$ 300,00.",
} as const;

describe("describeCouponTransition", () => {
  it("aplicado, de novo, deixou de valer e removido", () => {
    expect(describeCouponTransition(none, valid, "pt-BR")).toBe("Cupom DESCONTO50 aplicado.");
    expect(describeCouponTransition(ineligible, valid, "pt-BR")).toBe(
      "Cupom DESCONTO50 aplicado de novo.",
    );
    expect(describeCouponTransition(valid, ineligible, "pt-BR")).toBe(
      "O cupom DESCONTO50 deixou de valer: válido para reservas a partir de R$ 300,00. O total foi atualizado.",
    );
    expect(describeCouponTransition(valid, none, "pt-BR")).toBe("Cupom removido.");
  });

  it("erro anuncia o texto do erro, inclusive repetido", () => {
    const error = { kind: "error", message: "Cupom não encontrado. Confira o código." } as const;
    expect(describeCouponTransition(none, error, "pt-BR")).toBe(error.message);
    expect(describeCouponTransition(error, error, "pt-BR")).toBe(error.message);
  });

  it("sem mudança ou erro limpo não anuncia", () => {
    expect(describeCouponTransition(none, none, "pt-BR")).toBeNull();
    expect(describeCouponTransition(valid, valid, "pt-BR")).toBeNull();
    expect(describeCouponTransition({ kind: "error", message: "x" }, none, "pt-BR")).toBeNull();
  });
});

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
    expect(describeCouponTransition(none, valid)).toBe("Cupom DESCONTO50 aplicado.");
    expect(describeCouponTransition(ineligible, valid)).toBe("Cupom DESCONTO50 aplicado de novo.");
    expect(describeCouponTransition(valid, ineligible)).toBe(
      "O cupom DESCONTO50 deixou de valer: válido para reservas a partir de R$ 300,00. O total foi atualizado.",
    );
    expect(describeCouponTransition(valid, none)).toBe("Cupom removido.");
  });

  it("erro anuncia o texto do erro, inclusive repetido", () => {
    const error = { kind: "error", message: "Cupom não encontrado. Confira o código." } as const;
    expect(describeCouponTransition(none, error)).toBe(error.message);
    expect(describeCouponTransition(error, error)).toBe(error.message);
  });

  it("sem mudança ou erro limpo não anuncia", () => {
    expect(describeCouponTransition(none, none)).toBeNull();
    expect(describeCouponTransition(valid, valid)).toBeNull();
    expect(describeCouponTransition({ kind: "error", message: "x" }, none)).toBeNull();
  });
});

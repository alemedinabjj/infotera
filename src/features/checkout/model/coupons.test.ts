import { describe, expect, it } from "vitest";
import {
  COUPONS,
  couponBenefit,
  couponCodeSchema,
  couponMessage,
  evaluateCoupon,
  findCoupon,
  normalizeCouponCode,
} from "./coupons";

const TODAY = "2026-11-19";
const context = { today: TODAY, nights: 3, subtotalCents: 360000 };
const plain = (value: string) => value.replaceAll(" ", " ");

describe("normalizeCouponCode / couponCodeSchema", () => {
  it("normaliza com trim e maiúsculas", () => {
    expect(normalizeCouponCode("  bemvindo10 ")).toBe("BEMVINDO10");
  });

  it.each(["BEMVINDO10", "ABCD", "ABCDEFGHIJKL"])("aceita %s", (code) => {
    expect(couponCodeSchema.safeParse(code).success).toBe(true);
  });

  it.each(["ABC", "ABCDEFGHIJKLM", "BEM VINDO10", "BEM-VINDO", "", "ação1"])(
    "rejeita %j",
    (code) => {
      const result = couponCodeSchema.safeParse(normalizeCouponCode(code));
      expect(result.success).toBe(false);
    },
  );

  it("o formato inválido tem a mensagem do design system", () => {
    expect(couponCodeSchema.safeParse("a b").error?.issues[0]?.message).toBe(
      "Use de 4 a 12 letras ou números, sem espaços.",
    );
  });
});

describe("findCoupon", () => {
  it("acha os cupons de demonstração e ignora o resto (inclusive protótipo)", () => {
    expect(Object.keys(COUPONS)).toEqual(["BEMVINDO10", "FERIAS15", "DESCONTO50", "VERAO2024"]);
    expect(findCoupon("BEMVINDO10")?.code).toBe("BEMVINDO10");
    expect(findCoupon("NAOEXISTE")).toBeNull();
    expect(findCoupon("constructor")).toBeNull();
  });
});

describe("evaluateCoupon", () => {
  it("BEMVINDO10 sempre vale", () => {
    expect(evaluateCoupon(findCoupon("BEMVINDO10"), context)).toEqual({
      ok: true,
      discount: { code: "BEMVINDO10", kind: "percent", bps: 1000 },
    });
  });

  it("não encontrado", () => {
    expect(evaluateCoupon(null, context)).toEqual({ ok: false, reason: { kind: "not-found" } });
  });

  it("VERAO2024 expirou (por today); no último dia ainda valia", () => {
    expect(evaluateCoupon(findCoupon("VERAO2024"), context)).toEqual({
      ok: false,
      reason: { kind: "expired" },
    });
    expect(evaluateCoupon(findCoupon("VERAO2024"), { ...context, today: "2024-03-31" }).ok).toBe(
      true,
    );
  });

  it("FERIAS15 exige 3 noites", () => {
    expect(evaluateCoupon(findCoupon("FERIAS15"), { ...context, nights: 2 })).toEqual({
      ok: false,
      reason: { kind: "min-nights", nights: 3 },
    });
    expect(evaluateCoupon(findCoupon("FERIAS15"), { ...context, nights: 3 }).ok).toBe(true);
  });

  it("DESCONTO50 exige subtotal de R$ 300", () => {
    expect(evaluateCoupon(findCoupon("DESCONTO50"), { ...context, subtotalCents: 29999 })).toEqual({
      ok: false,
      reason: { kind: "min-subtotal", cents: 30000 },
    });
    expect(evaluateCoupon(findCoupon("DESCONTO50"), { ...context, subtotalCents: 30000 })).toEqual({
      ok: true,
      discount: { code: "DESCONTO50", kind: "fixed", cents: 5000 },
    });
  });
});

describe("couponMessage / couponBenefit", () => {
  it("mensagens do design system", () => {
    expect(couponMessage({ kind: "not-found" })).toBe("Cupom não encontrado. Confira o código.");
    expect(couponMessage({ kind: "expired" })).toBe("Este cupom expirou.");
    expect(couponMessage({ kind: "min-nights", nights: 3 })).toBe(
      "Válido para estadias a partir de 3 noites.",
    );
    expect(plain(couponMessage({ kind: "min-subtotal", cents: 30000 }))).toBe(
      "Válido para reservas a partir de R$ 300,00.",
    );
  });

  it("benefício legível", () => {
    expect(couponBenefit(COUPONS.BEMVINDO10 ?? never())).toBe("10% de desconto");
    expect(plain(couponBenefit(COUPONS.DESCONTO50 ?? never()))).toBe("R$ 50,00 de desconto");
  });
});

function never(): never {
  throw new Error("cupom de teste ausente");
}

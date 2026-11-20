import { describe, expect, it } from "vitest";
import { type FailedResult, submitFeedback } from "./create-booking-result";
import { calculatePrice } from "./price";

const plain = (value: string) => value.replaceAll(" ", " ");
const context = {
  previousTotalCents: 414000,
  totalWithoutCouponCents: 414000,
  couponCode: "BEMVINDO10",
  online: true,
};
const feedback = (result: FailedResult, patch: Partial<typeof context> = {}) => {
  const value = submitFeedback(result, { ...context, ...patch }, "pt-BR");
  return { ...value, description: plain(value.description) };
};

describe("submitFeedback", () => {
  it("failed online: alerta danger e retry", () => {
    expect(feedback({ status: "failed", kind: "network" })).toEqual({
      tone: "danger",
      title: "Não foi possível confirmar sua reserva",
      description:
        "Nenhuma cobrança foi feita. Seus dados foram mantidos; tente de novo em instantes.",
      action: "retry",
    });
  });

  it("failed offline: warning", () => {
    expect(feedback({ status: "failed", kind: "network" }, { online: false })).toMatchObject({
      tone: "warning",
      title: "Você está sem conexão.",
      description: "Nada foi cobrado. Tente de novo quando a conexão voltar.",
      action: "retry",
    });
  });

  it("price-changed mostra o total antigo e o novo", () => {
    const quote = calculatePrice({ pricePerNight: 1300, nights: 3, rooms: 1 });
    expect(feedback({ status: "price-changed", quote })).toMatchObject({
      title: "O total da reserva mudou",
      description:
        "Passou de R$ 4.140,00 para R$ 4.485,00. Confira o novo valor e confirme de novo. Nada foi cobrado.",
      action: "none",
    });
  });

  it("unavailable: esgotou ou sobra", () => {
    expect(feedback({ status: "unavailable", available: 0 })).toMatchObject({
      title: "Este quarto esgotou enquanto você reservava",
      action: "view-rooms",
    });
    expect(feedback({ status: "unavailable", available: 1 }).title).toBe(
      "Só 1 quarto disponível agora",
    );
    expect(feedback({ status: "unavailable", available: 2 }).title).toBe(
      "Só 2 quartos disponíveis agora",
    );
  });

  it("coupon-invalid cita o cupom e o novo total", () => {
    expect(feedback({ status: "coupon-invalid", reason: { kind: "expired" } })).toMatchObject({
      title: "O cupom BEMVINDO10 não vale mais",
      description:
        "Removemos o desconto e o total agora é R$ 4.140,00. Confira e confirme de novo. Nada foi cobrado.",
    });
  });

  it("invalid tem texto de fallback", () => {
    expect(feedback({ status: "invalid", fields: [] }).description).toBe(
      "Confira este dado e tente de novo.",
    );
  });
});

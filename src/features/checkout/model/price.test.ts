import { describe, expect, it } from "vitest";
import { applyBps, calculatePrice, ISS_BPS, SERVICE_FEE_BPS } from "./price";
import { priceLineAmount, priceLineLabel } from "./price-labels";

const plain = (value: string) => value.replaceAll(" ", " ");

describe("applyBps", () => {
  it("arredonda meio centavo para cima", () => {
    expect(applyBps(5, 1000)).toBe(1); // 0,5
    expect(applyBps(4, 1000)).toBe(0); // 0,4
    expect(applyBps(15, 1000)).toBe(2); // 1,5
  });
});

describe("calculatePrice", () => {
  it("1 quarto, 3 noites a R$ 1.200", () => {
    const quote = calculatePrice({ pricePerNight: 1200, nights: 3, rooms: 1 });
    expect(quote).toMatchObject({
      subtotalCents: 360000,
      discountCents: 0,
      serviceFeeCents: 36000,
      taxCents: 18000,
      totalCents: 414000,
      couponCode: null,
    });
  });

  it.each([
    [1, 1, 180],
    [30, 4, 3730],
    [7, 2, 199.9],
  ])("total = soma das linhas (%i noites, %i quartos, R$ %f)", (nights, rooms, price) => {
    const quote = calculatePrice({ pricePerNight: price, nights, rooms });
    const sum = quote.lines.reduce(
      (acc, line) => acc + (line.kind === "discount" ? -line.amountCents : line.amountCents),
      0,
    );
    expect(quote.totalCents).toBe(sum);
    expect(Number.isInteger(quote.totalCents)).toBe(true);
    expect(quote.subtotalCents).toBe(Math.round(price * 100) * nights * rooms);
  });

  it("maior produto possível continua inteiro seguro", () => {
    const quote = calculatePrice({
      pricePerNight: 3730,
      nights: 30,
      rooms: 4,
      discount: { code: "X", kind: "percent", bps: 1500 },
    });
    expect(Number.isSafeInteger(quote.totalCents)).toBe(true);
  });

  it("cupom percentual: taxas incidem sobre a base com desconto", () => {
    const quote = calculatePrice({
      pricePerNight: 1200,
      nights: 3,
      rooms: 1,
      discount: { code: "BEMVINDO10", kind: "percent", bps: 1000 },
    });
    expect(quote).toMatchObject({
      discountCents: 36000,
      serviceFeeCents: 32400,
      taxCents: 16200,
      totalCents: 372600,
      couponCode: "BEMVINDO10",
    });
  });

  it("percentual com meio centavo arredonda para cima", () => {
    // 1 noite a R$ 0,05 → subtotal 5 centavos; 10% = 0,5 → 1
    const quote = calculatePrice({ pricePerNight: 0.05, nights: 1, rooms: 1 });
    expect(quote.serviceFeeCents).toBe(1);
  });

  it("desconto fixo maior que o subtotal limita a zero a base", () => {
    const quote = calculatePrice({
      pricePerNight: 20,
      nights: 1,
      rooms: 1,
      discount: { code: "GRANDE", kind: "fixed", cents: 999999 },
    });
    expect(quote.discountCents).toBe(2000);
    expect(quote.totalCents).toBe(0);
  });

  it("usa as constantes de taxa", () => {
    const quote = calculatePrice({ pricePerNight: 100, nights: 1, rooms: 1 });
    expect(quote.serviceFeeCents).toBe(applyBps(10000, SERVICE_FEE_BPS));
    expect(quote.taxCents).toBe(applyBps(10000, ISS_BPS));
  });

  it("linhas em ordem fixa: estadia, desconto, taxa, ISS", () => {
    const quote = calculatePrice({
      pricePerNight: 100,
      nights: 1,
      rooms: 1,
      discount: { code: "ABCD", kind: "fixed", cents: 1000 },
    });
    expect(quote.lines.map((l) => l.kind)).toEqual(["stay", "discount", "service-fee", "tax"]);
  });
});

describe("priceLineLabel / priceLineAmount", () => {
  it("rótulos com singular e plural", () => {
    expect(
      plain(
        priceLineLabel({ kind: "stay", nightlyCents: 120000, nights: 3, rooms: 2, amountCents: 1 }),
      ),
    ).toBe("R$ 1.200,00 × 3 noites × 2 quartos");
    expect(
      plain(
        priceLineLabel({ kind: "stay", nightlyCents: 18000, nights: 1, rooms: 1, amountCents: 1 }),
      ),
    ).toBe("R$ 180,00 × 1 noite × 1 quarto");
    expect(priceLineLabel({ kind: "discount", code: "BEMVINDO10", amountCents: 1 })).toBe(
      "Desconto (BEMVINDO10)",
    );
    expect(priceLineLabel({ kind: "service-fee", bps: 1000, amountCents: 1 })).toBe(
      "Taxa de serviço (10%)",
    );
    expect(priceLineLabel({ kind: "tax", bps: 500, amountCents: 1 })).toBe("ISS (5%)");
  });

  it("o desconto leva o sinal de menos", () => {
    expect(plain(priceLineAmount({ kind: "discount", code: "ABCD", amountCents: 72000 }))).toBe(
      "−R$ 720,00",
    );
    expect(plain(priceLineAmount({ kind: "tax", bps: 500, amountCents: 64800 }))).toBe("R$ 648,00");
  });
});

import { describe, expect, it } from "vitest";
import { findCoupon } from "./coupons";
import { buildQuote } from "./quote";

const TODAY = "2026-11-19";
const input = { pricePerNight: 200, nights: 1, rooms: 2, today: TODAY };

describe("buildQuote", () => {
  it("sem cupom devolve o preço base", () => {
    const result = buildQuote({ ...input, coupon: null });
    expect(result.coupon).toEqual({ state: "none" });
    expect(result.quote).toBe(result.baseQuote);
  });

  it("cupom elegível desconta e DESCONTO50 sai do total quando o subtotal cai", () => {
    const coupon = findCoupon("DESCONTO50");
    const two = buildQuote({ ...input, coupon });
    expect(two.coupon.state).toBe("valid");
    expect(two.quote.discountCents).toBe(5000);
    const one = buildQuote({ ...input, rooms: 1, coupon });
    expect(one.coupon).toMatchObject({ state: "ineligible", reason: { kind: "min-subtotal" } });
    expect(one.quote.totalCents).toBe(one.baseQuote.totalCents);
    expect(one.quote.discountCents).toBe(0);
  });

  it("voltando a valer, o desconto volta", () => {
    const coupon = findCoupon("DESCONTO50");
    const again = buildQuote({ ...input, rooms: 2, coupon });
    expect(again.coupon.state).toBe("valid");
  });
});

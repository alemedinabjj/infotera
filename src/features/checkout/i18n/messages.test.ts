import { describe, expect, it } from "vitest";
import { makeSearchCriteria } from "@/shared/testing/fixtures";
import { describeBlocked } from "../model/blocked";
import { makeCheckoutSchema, phoneMessage, validationMessages } from "../model/checkout.schema";
import { ageLabel, companionLabel } from "../model/companions";
import { describeCouponTransition } from "../model/coupon-announcement";
import { couponBenefit, couponMessage, findCoupon } from "../model/coupons";
import { submitFeedback } from "../model/create-booking-result";
import { noticeText } from "../model/notices";
import { roomCountBounds } from "../model/room-count";
import { stepDocumentTitle } from "../model/steps";
import { describeGuestsAndRooms, describeLongDate } from "../model/summary-labels";
import { termsSections } from "../model/terms";
import { checkoutMessages } from "./messages";

const TODAY = "2026-11-19";
const criteria = makeSearchCriteria({
  checkIn: "2026-12-01",
  checkOut: "2026-12-04",
  adults: 2,
  children: 1,
  rooms: 1,
});

const issues = (locale: "pt-BR" | "en-US") => {
  const result = makeCheckoutSchema(TODAY, locale).safeParse({
    contact: { firstName: "", lastName: "", email: "", phoneCountry: "BR", phone: "" },
    companions: [],
    payment: {
      cardNumber: "",
      cardName: "",
      expiry: "",
      cvv: "",
      documentType: "cpf",
      document: "",
    },
    termsAccepted: false,
  });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("dicionário do checkout", () => {
  it("mensagens do schema saem no idioma pedido", () => {
    const en = validationMessages("en-US");
    expect(issues("en-US")).toEqual(
      expect.arrayContaining([en.firstNameRequired, en.emailRequired, en.cardRequired, en.terms]),
    );
    expect(issues("pt-BR")).toContain(validationMessages("pt-BR").terms);
    expect(issues("en-US")).not.toContain(validationMessages("pt-BR").terms);
  });

  it("telefone: país, DDD inexistente e celular sem 9", () => {
    const en = validationMessages("en-US");
    expect(phoneMessage("US", { ok: false, reason: "length" }, "en-US")).toBe(en.phone.US);
    expect(phoneMessage("BR", { ok: false, reason: "area-code", areaCode: "10" }, "en-US")).toBe(
      en.areaCode("10"),
    );
    expect(phoneMessage("BR", { ok: false, reason: "mobile-nine" }, "en-US")).toBe(en.mobileNine);
    expect(phoneMessage("BR", { ok: true }, "en-US")).toBeNull();
  });

  it("cupom: motivos, benefício e anúncio em inglês", () => {
    expect(couponMessage({ kind: "expired" }, "en-US")).toBe("This coupon has expired.");
    expect(couponMessage({ kind: "min-subtotal", cents: 30000 }, "en-US")).toBe(
      "Valid for bookings of R$300.00 or more.",
    );
    const coupon = findCoupon("BEMVINDO10");
    if (!coupon) throw new Error("cupom de teste ausente");
    expect(couponBenefit(coupon, "en-US")).toBe("10% off");
    expect(
      describeCouponTransition(
        { kind: "valid", code: "FERIAS15" },
        { kind: "ineligible", code: "FERIAS15", message: "Valid for stays of 3 nights or more." },
        "en-US",
      ),
    ).toBe(
      "Coupon FERIAS15 is no longer valid: valid for stays of 3 nights or more. The total was updated.",
    );
  });

  it("resumo, datas e capacidade em inglês", () => {
    expect(describeGuestsAndRooms(criteria, "en-US")).toBe("2 adults and 1 child · 1 room");
    expect(describeLongDate("2026-12-01", "en-US")).toMatch(/Tue/);
    expect(companionLabel(0, "adult", "en-US")).toBe("Guest 2 · adult");
    expect(ageLabel(0, "en-US")).toBe("Under 1 year");
    expect(stepDocumentTitle("payment", "en-US")).toBe("Step 2 of 3: Payment");
  });

  it("bloqueio, quartos e avisos em inglês", () => {
    const copy = describeBlocked({
      reason: "insufficient",
      criteria: { ...criteria, rooms: 3 },
      roomName: "Suite",
      available: 1,
      maxGuests: 2,
      today: TODAY,
      locale: "en-US",
    });
    expect(copy.title).toBe("Only 1 room available");
    expect(copy.action).toBe("View rooms");
    expect(
      roomCountBounds({ adults: 1, children: 0 }, { available: 2, maxGuests: 2 }, "en-US").maxHint,
    ).toBe("Each room needs at least 1 adult.");
    expect(noticeText("payment-wiped", false, "en-US")).toMatch(/card details are not saved/);
  });

  it("feedback do envio e termos em inglês, valores em BRL", () => {
    const context = {
      previousTotalCents: 100000,
      totalWithoutCouponCents: 120000,
      couponCode: null,
      online: true,
    };
    const offline = submitFeedback(
      { status: "failed", kind: "unknown" },
      { ...context, online: false },
      "en-US",
    );
    expect(offline.title).toBe("You are offline.");
    const coupon = submitFeedback(
      { status: "coupon-invalid", reason: { kind: "expired" } },
      context,
      "en-US",
    );
    expect(coupon.title).toBe("Coupon you entered is no longer valid");
    expect(coupon.description).toContain("R$1,200.00");
    const sections = termsSections(
      { policy: "free", checkInTime: null, checkOutTime: null },
      "en-US",
    );
    expect(sections.map((section) => section.title)).toContain("Cancellation");
    expect(sections.flatMap((section) => section.paragraphs).join(" ")).toContain(
      "Cancel for free",
    );
  });

  it("pt-BR e en-US têm as mesmas chaves (formato garantido pelo tipo)", () => {
    expect(Object.keys(checkoutMessages.get("en-US")).sort()).toEqual(
      Object.keys(checkoutMessages.get("pt-BR")).sort(),
    );
  });
});

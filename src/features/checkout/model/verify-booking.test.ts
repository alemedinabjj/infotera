import { describe, expect, it } from "vitest";
import { makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import type { BookingRequest } from "./booking-request";
import { calculatePrice } from "./price";
import { verifyBookingRequest } from "./verify-booking";

const TODAY = "2026-11-19";
const criteria = makeSearchCriteria({ checkIn: "2026-12-20", checkOut: "2026-12-23" });
const room = makeRoom({ pricePerNight: 1200, available: 8, maxGuests: 3 });
const quote = calculatePrice({ pricePerNight: 1200, nights: 3, rooms: 1 });

const request = (patch: Partial<BookingRequest> = {}): BookingRequest => ({
  attemptId: "8b0e4d2a-6f3c-4a1b-9c7d-2e5f8a1b3c4d",
  hotelId: 1,
  roomId: 1,
  criteria,
  couponCode: null,
  contact: { firstName: "Ana", lastName: "Souza", email: "a@b.co", phone: "+5511987654321" },
  companions: [{ kind: "adult", firstName: "Bruno", lastName: "Souza", age: null }],
  cardLast4: "1111",
  expectedTotalCents: quote.totalCents,
  ...patch,
});

const verify = (req: BookingRequest, r = room, today = TODAY) =>
  verifyBookingRequest(req, { id: 1 }, r, today);

describe("verifyBookingRequest", () => {
  it("pedido válido devolve o quote recalculado", () => {
    expect(verify(request())).toEqual({ ok: true, quote });
  });

  it("preço mudou: devolve o novo quote", () => {
    const result = verify(request({ expectedTotalCents: 1 }), makeRoom({ pricePerNight: 1300 }));
    expect(result).toMatchObject({
      ok: false,
      rejection: { status: "price-changed", quote: { totalCents: 448500 } },
    });
  });

  it("esgotado e poucos quartos viram unavailable com a sobra", () => {
    expect(verify(request(), makeRoom({ available: 0 }))).toEqual({
      ok: false,
      rejection: { status: "unavailable", available: 0 },
    });
    const two = { ...request(), criteria: { ...criteria, rooms: 2 } };
    expect(verify(two, makeRoom({ available: 1 }))).toEqual({
      ok: false,
      rejection: { status: "unavailable", available: 1 },
    });
  });

  it("quarto de outro hotel é unavailable 0", () => {
    expect(verify(request(), makeRoom({ hotelId: 5 }))).toEqual({
      ok: false,
      rejection: { status: "unavailable", available: 0 },
    });
  });

  it("check-in de ontem passa pela tolerância de 1 dia; anteontem não", () => {
    const yesterday = { ...criteria, checkIn: "2026-11-18", checkOut: "2026-11-21" };
    const q = calculatePrice({ pricePerNight: 1200, nights: 3, rooms: 1 });
    expect(verify(request({ criteria: yesterday, expectedTotalCents: q.totalCents })).ok).toBe(
      true,
    );
    const before = { ...criteria, checkIn: "2026-11-17", checkOut: "2026-11-20" };
    expect(verify(request({ criteria: before })).ok).toBe(false);
  });

  it("quarto pequeno para a busca é inválido", () => {
    expect(verify(request(), makeRoom({ maxGuests: 1 }))).toEqual({
      ok: false,
      rejection: { status: "invalid", fields: [] },
    });
  });

  it("cupom elegível entra no cálculo", () => {
    const discounted = calculatePrice({
      pricePerNight: 1200,
      nights: 3,
      rooms: 1,
      discount: { code: "BEMVINDO10", kind: "percent", bps: 1000 },
    });
    const result = verify(
      request({ couponCode: "BEMVINDO10", expectedTotalCents: discounted.totalCents }),
    );
    expect(result).toEqual({ ok: true, quote: discounted });
  });

  it.each([
    ["NAOEXISTE", { kind: "not-found" }],
    ["VERAO2024", { kind: "expired" }],
  ] as const)("cupom %s é recusado", (code, reason) => {
    expect(verify(request({ couponCode: code }))).toEqual({
      ok: false,
      rejection: { status: "coupon-invalid", reason },
    });
  });

  it("cupom de mínimo de noites inelegível", () => {
    const short = { ...criteria, checkOut: "2026-12-22" };
    expect(verify(request({ criteria: short, couponCode: "FERIAS15" }))).toMatchObject({
      ok: false,
      rejection: { status: "coupon-invalid", reason: { kind: "min-nights", nights: 3 } },
    });
  });
});

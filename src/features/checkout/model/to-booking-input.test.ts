import { describe, expect, it } from "vitest";
import { bookingInputSchema } from "@/shared/api/schemas";
import { makeSearchCriteria } from "@/shared/testing/fixtures";
import type { BookingRequest } from "./booking-request";
import { calculatePrice } from "./price";
import { toBookingInput } from "./to-booking-input";

const request: BookingRequest = {
  attemptId: "8b0e4d2a-6f3c-4a1b-9c7d-2e5f8a1b3c4d",
  hotelId: 1,
  roomId: 1,
  criteria: makeSearchCriteria({
    checkIn: "2026-12-20",
    checkOut: "2026-12-23",
    adults: 2,
    children: 1,
  }),
  couponCode: "BEMVINDO10",
  contact: {
    firstName: "Ana",
    lastName: "Souza",
    email: "ana@exemplo.com",
    phone: "+5511987654321",
  },
  companions: [
    { kind: "adult", firstName: "Bruno", lastName: "Souza", age: null },
    { kind: "child", firstName: "Clara", lastName: "Souza", age: 7 },
  ],
  cardLast4: "1111",
  expectedTotalCents: 372600,
};
const quote = calculatePrice({
  pricePerNight: 1200,
  nights: 3,
  rooms: 1,
  discount: { code: "BEMVINDO10", kind: "percent", bps: 1000 },
});
const NOW = new Date("2026-11-19T15:04:05.000Z");

describe("toBookingInput", () => {
  const input = toBookingInput(request, quote, NOW);

  it("monta o corpo do exemplo da spec", () => {
    expect(input).toEqual({
      id: request.attemptId,
      hotelId: 1,
      roomId: 1,
      checkIn: "2026-12-20",
      checkOut: "2026-12-23",
      rooms: 1,
      adults: 2,
      children: 1,
      guests: [
        {
          firstName: "Ana",
          lastName: "Souza",
          email: "ana@exemplo.com",
          phone: "+5511987654321",
          kind: "adult",
        },
        { firstName: "Bruno", lastName: "Souza", kind: "adult" },
        { firstName: "Clara", lastName: "Souza", kind: "child", age: 7 },
      ],
      totalPrice: 3726,
      payment: { method: "credit_card", cardLast4: "1111" },
      priceBreakdown: {
        nightlyCents: 120000,
        nights: 3,
        rooms: 1,
        subtotalCents: 360000,
        discountCents: 36000,
        serviceFeeCents: 32400,
        taxCents: 16200,
        totalCents: 372600,
        couponCode: "BEMVINDO10",
      },
      createdAt: "2026-11-19T15:04:05.000Z",
    });
  });

  it("é um BookingInput válido e contato só no titular", () => {
    const { id: _id, ...body } = input;
    expect(bookingInputSchema.safeParse(body).success).toBe(true);
    expect(input.guests.slice(1).every((g) => g.email === undefined && g.phone === undefined)).toBe(
      true,
    );
  });

  it("sem cupom, o breakdown não tem couponCode", () => {
    const plain = calculatePrice({ pricePerNight: 1200, nights: 3, rooms: 1 });
    expect(toBookingInput(request, plain, NOW).priceBreakdown).not.toHaveProperty("couponCode");
  });
});

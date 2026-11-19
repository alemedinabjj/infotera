import { describe, expect, it } from "vitest";
import type { Booking } from "@/shared/api/schemas";
import { bookingMatchesInput } from "./booking-match";

const input: Booking = {
  id: "x",
  hotelId: 1,
  roomId: 2,
  checkIn: "2026-12-20",
  checkOut: "2026-12-23",
  rooms: 1,
  adults: 2,
  children: 0,
  guests: [{ firstName: "Ana", lastName: "Souza", email: "ana@exemplo.com", kind: "adult" }],
  totalPrice: 4140,
  payment: { method: "credit_card", cardLast4: "1111" },
  createdAt: "2026-11-19T15:04:05.000Z",
};

describe("bookingMatchesInput", () => {
  it("aceita a mesma reserva", () => {
    expect(bookingMatchesInput({ ...input }, input)).toBe(true);
  });

  it.each([
    ["hotel", { hotelId: 9 }],
    ["quarto", { roomId: 9 }],
    ["entrada", { checkIn: "2026-12-21" }],
    ["saída", { checkOut: "2026-12-24" }],
    ["total", { totalPrice: 1 }],
    ["cartão", { payment: { method: "credit_card", cardLast4: "2222" } }],
    [
      "e-mail",
      { guests: [{ firstName: "Ana", lastName: "Souza", email: "b@exemplo.com", kind: "adult" }] },
    ],
  ] satisfies [string, Partial<Booking>][])("recusa quando %s difere", (_name, patch) => {
    expect(bookingMatchesInput({ ...input, ...patch }, input)).toBe(false);
  });
});

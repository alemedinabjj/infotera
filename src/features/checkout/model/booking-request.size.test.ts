import { describe, expect, it } from "vitest";
import { SEARCH_LIMITS } from "@/shared/lib/search-params";
import { makeSearchCriteria } from "@/shared/testing/fixtures";
import { bookingRequestSchema, toBookingRequest } from "./booking-request";
import type { CheckoutValues } from "./checkout.schema";
import { calculatePrice } from "./price";

// F7c, critério 23: o teto de corpo da Server Action é 64 KB (`next.config.ts`).
const BODY_SIZE_LIMIT = 64 * 1024;
const ATTEMPT = "8b0e4d2a-6f3c-4a1b-9c7d-2e5f8a1b3c4d";
// O schema não limita e-mail, nome no cartão nem documento: 1.000 caracteres cobre qualquer colagem.
const GENEROUS = 1000;
const NAME_MAX = 60;

const maxGuests = SEARCH_LIMITS.maxRooms * SEARCH_LIMITS.maxGuestsPerRoom;
const children = maxGuests - SEARCH_LIMITS.maxAdults;
const criteria = makeSearchCriteria({
  checkIn: "2026-12-20",
  checkOut: "2026-12-23",
  rooms: SEARCH_LIMITS.maxRooms,
  adults: SEARCH_LIMITS.maxAdults,
  children,
});
const selection = { hotelId: 60, roomId: 180, criteria };
const quote = calculatePrice({ pricePerNight: 99_999, nights: 3, rooms: SEARCH_LIMITS.maxRooms });

const name = "Á".repeat(NAME_MAX);
const companions: CheckoutValues["companions"] = Array.from({ length: maxGuests - 1 }, (_, i) =>
  i < SEARCH_LIMITS.maxAdults - 1
    ? { kind: "adult", firstName: name, lastName: name, age: "" }
    : { kind: "child", firstName: name, lastName: name, age: "17" },
);

const maxValues: CheckoutValues = {
  contact: {
    firstName: name,
    lastName: name,
    email: `${"a".repeat(GENEROUS)}@exemplo.com`,
    phoneCountry: "BR",
    phone: "9".repeat(GENEROUS),
  },
  companions,
  payment: {
    cardNumber: "4".repeat(GENEROUS),
    cardName: "A".repeat(GENEROUS),
    expiry: "12/99",
    cvv: "1234",
    documentType: "passport",
    document: "A".repeat(GENEROUS),
  },
  termsAccepted: true,
};

const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

describe("tamanho máximo do corpo da Server Action (critério 23)", () => {
  it("4 quartos × 5 hóspedes com todos os campos no máximo cabem em 64 KB", () => {
    expect(maxValues.companions).toHaveLength(maxGuests - 1);
    expect(bytes(maxValues)).toBeLessThan(BODY_SIZE_LIMIT);
  });

  it("o pedido que realmente sai (referências, sem cartão) é bem menor e continua válido", () => {
    const request = toBookingRequest(
      {
        ...maxValues,
        contact: { ...maxValues.contact, email: "ana@exemplo.com", phone: "11987654321" },
      },
      selection,
      quote,
      ATTEMPT,
    );
    expect(bookingRequestSchema.safeParse(request).success).toBe(true);
    expect(bytes(request)).toBeLessThan(BODY_SIZE_LIMIT / 4);
  });
});

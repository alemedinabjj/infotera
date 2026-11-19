import { describe, expect, it } from "vitest";
import { makeHotel, makeSearchCriteria } from "@/shared/testing/fixtures";
import { deriveCardPricing } from "./card-pricing";

const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15", rooms: 1 });

describe("deriveCardPricing", () => {
  it("stay disponível: total = diária × noites × quartos (critério 3)", () => {
    const hotel = makeHotel({ pricePerNight: 180, availableRooms: 9 });
    expect(deriveCardPricing(hotel, criteria)).toMatchObject({
      status: "available",
      nightly: 180,
      stay: { total: 540, nights: 3, rooms: 1 },
    });
    expect(deriveCardPricing(hotel, { ...criteria, rooms: 2, adults: 2 }).stay?.total).toBe(1080);
  });

  it("browse: sem total", () => {
    expect(deriveCardPricing(makeHotel({ availableRooms: 9 }), null).stay).toBeNull();
  });

  it("escassez ainda tem total e selo", () => {
    const pricing = deriveCardPricing(
      makeHotel({ pricePerNight: 100, availableRooms: 1 }),
      criteria,
    );
    expect(pricing.stay?.total).toBe(300);
    expect(pricing.availability.badge?.text).toBe("Apenas 1 quarto!");
  });

  it("esgotado e insuficiente não têm total, mas mantêm a diária", () => {
    const soldOut = deriveCardPricing(
      makeHotel({ availableRooms: 0, pricePerNight: 250 }),
      criteria,
    );
    expect(soldOut).toMatchObject({ status: "sold-out", stay: null, nightly: 250 });
    const insufficient = deriveCardPricing(makeHotel({ availableRooms: 2 }), {
      ...criteria,
      rooms: 3,
      adults: 3,
    });
    expect(insufficient).toMatchObject({ status: "insufficient", stay: null });
    expect(insufficient.availability.note).toBe("Sua busca pede 3 quartos.");
  });
});

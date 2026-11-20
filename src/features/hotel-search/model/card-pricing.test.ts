import { describe, expect, it } from "vitest";
import { makeHotel, makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { cheapestFittingRoom, deriveCardPricing } from "./card-pricing";

const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15", rooms: 1 });

describe("deriveCardPricing", () => {
  it("stay disponível: total com taxas (serviço + ISS) de diária × noites × quartos (critério 3)", () => {
    const hotel = makeHotel({ pricePerNight: 180, availableRooms: 9 });
    expect(deriveCardPricing(hotel, criteria, undefined, "pt-BR")).toMatchObject({
      status: "available",
      nightly: 180,
      stay: { total: 621, nights: 3, rooms: 1 },
    });
    expect(
      deriveCardPricing(hotel, { ...criteria, rooms: 2, adults: 2 }, undefined, "pt-BR").stay
        ?.total,
    ).toBe(1242);
  });

  it("browse: sem total", () => {
    expect(
      deriveCardPricing(makeHotel({ availableRooms: 9 }), null, undefined, "pt-BR").stay,
    ).toBeNull();
  });

  it("escassez ainda tem total e selo", () => {
    const pricing = deriveCardPricing(
      makeHotel({ pricePerNight: 100, availableRooms: 1 }),
      criteria,
      undefined,
      "pt-BR",
    );
    expect(pricing.stay?.total).toBe(345);
    expect(pricing.availability.badge?.text).toBe("Apenas 1 quarto!");
  });

  it("esgotado e insuficiente não têm total, mas mantêm a diária", () => {
    const soldOut = deriveCardPricing(
      makeHotel({ availableRooms: 0, pricePerNight: 250 }),
      criteria,
      undefined,
      "pt-BR",
    );
    expect(soldOut).toMatchObject({ status: "sold-out", stay: null, nightly: 250 });
    const insufficient = deriveCardPricing(
      makeHotel({ availableRooms: 2 }),
      {
        ...criteria,
        rooms: 3,
        adults: 3,
      },
      undefined,
      "pt-BR",
    );
    expect(insufficient).toMatchObject({ status: "insufficient", stay: null });
    expect(insufficient.availability.note).toBe("Sua busca pede 3 quartos.");
  });
});

// Quartos do seed: hotel 1 (Rio), hotel 4 (Florianópolis) e hotéis 20 e 5 (São Paulo, grupo de 3).
const room = (id: number, pricePerNight: number, maxGuests: number, available: number) =>
  makeRoom({ id, pricePerNight, maxGuests, available });
const HOTEL_1 = [room(1, 1200, 3, 8), room(2, 800, 2, 4)];
const HOTEL_4 = [room(6, 890, 4, 5), room(7, 720, 5, 3)];
const HOTEL_20 = [room(49, 1270, 2, 6), room(50, 1310, 3, 2)];
const HOTEL_5 = [room(8, 1500, 2, 2)];

describe("cheapestFittingRoom", () => {
  it("sem busca: o mais barato com quarto livre", () => {
    expect(cheapestFittingRoom(HOTEL_1, null)?.id).toBe(2);
    expect(cheapestFittingRoom([room(1, 100, 2, 0), room(2, 300, 2, 1)], null)?.id).toBe(2);
    expect(cheapestFittingRoom([], null)).toBeNull();
  });

  it("hotéis 1 e 4 com 2 adultos: o mais barato (800 e 720)", () => {
    const party = { rooms: 1, guests: 2 };
    expect(cheapestFittingRoom(HOTEL_1, party)?.pricePerNight).toBe(800);
    expect(cheapestFittingRoom(HOTEL_4, party)?.pricePerNight).toBe(720);
  });

  it("grupo de 3: o mais barato não comporta, vale o seguinte; sem nenhum, null", () => {
    expect(cheapestFittingRoom(HOTEL_1, { rooms: 1, guests: 3 })?.pricePerNight).toBe(1200);
    expect(cheapestFittingRoom(HOTEL_20, { rooms: 1, guests: 3 })?.pricePerNight).toBe(1310);
    expect(cheapestFittingRoom(HOTEL_5, { rooms: 1, guests: 3 })).toBeNull();
  });

  it("vários quartos: `available` e a capacidade total contam", () => {
    expect(cheapestFittingRoom(HOTEL_20, { rooms: 3, guests: 6 })?.id).toBe(49);
    expect(cheapestFittingRoom(HOTEL_20, { rooms: 3, guests: 7 })?.id).toBeUndefined();
    expect(cheapestFittingRoom(HOTEL_20, { rooms: 7, guests: 7 })).toBeNull();
  });
});

describe("deriveCardPricing com quartos", () => {
  const stay = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15", adults: 2 });

  it("hotel 1: 'a partir de' é o quarto de 800, não o pricePerNight 1200 do hotel", () => {
    const hotel = makeHotel({ id: 1, pricePerNight: 1200, availableRooms: 12 });
    const pricing = deriveCardPricing(hotel, stay, HOTEL_1, "pt-BR");
    expect(pricing.nightly).toBe(800);
    expect(pricing.stay?.total).toBe(2760);
  });

  it("grupo de 3 em São Paulo: hotel 20 mostra o quarto de 1310 e o total dele", () => {
    const group = { ...stay, adults: 2, children: 1 };
    const hotel = makeHotel({ id: 20, pricePerNight: 1270, availableRooms: 8 });
    const pricing = deriveCardPricing(hotel, group, HOTEL_20, "pt-BR");
    expect(pricing).toMatchObject({ status: "available", nightly: 1310 });
    expect(pricing.stay?.total).toBe(4519.5);
  });

  it("nenhum quarto serve ao grupo: 'no-fit', sem total, com nota", () => {
    const group = { ...stay, adults: 2, children: 1 };
    const hotel = makeHotel({ id: 5, pricePerNight: 1500, availableRooms: 4 });
    const pricing = deriveCardPricing(hotel, group, HOTEL_5, "pt-BR");
    expect(pricing).toMatchObject({ status: "no-fit", stay: null });
    expect(pricing.availability.note).toBe("Nenhum quarto acomoda 3 hóspedes em 1 quarto.");
  });

  it("sem quartos conhecidos (falha do request): usa o pricePerNight do hotel", () => {
    const hotel = makeHotel({ pricePerNight: 180, availableRooms: 9 });
    expect(deriveCardPricing(hotel, stay, undefined, "pt-BR").stay?.total).toBe(621);
  });

  it("browse: 'a partir de' do mais barato livre, sem total", () => {
    const hotel = makeHotel({ id: 4, pricePerNight: 890, availableRooms: 8 });
    expect(deriveCardPricing(hotel, null, HOTEL_4, "pt-BR")).toMatchObject({
      nightly: 720,
      stay: null,
    });
  });
});

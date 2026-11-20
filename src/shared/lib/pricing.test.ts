import { describe, expect, it } from "vitest";
import { makeRoom } from "../testing/fixtures";
import { seedHotel, seedRooms } from "../testing/seed";
import { centsToReais } from "./currency";
import { feesOnBase } from "./price-breakdown";
import { lowestNightlyPrice, stayTotal, stayTotalWithFees } from "./pricing";

describe("stayTotal", () => {
  it("diária × noites × quartos (critério 3)", () => {
    expect(stayTotal({ pricePerNight: 180, nights: 3, rooms: 1 })).toBe(540);
    expect(stayTotal({ pricePerNight: 180, nights: 3, rooms: 2 })).toBe(1080);
  });

  it("sem erro de ponto flutuante com centavos (0,1 + 0,2)", () => {
    expect(stayTotal({ pricePerNight: 0.1, nights: 3, rooms: 1 })).toBe(0.3);
    expect(stayTotal({ pricePerNight: 0.2, nights: 3, rooms: 1 })).toBe(0.6);
    expect(stayTotal({ pricePerNight: 199.99, nights: 3, rooms: 1 })).toBe(599.97);
  });

  it("zero noites ou preço zero dá zero", () => {
    expect(stayTotal({ pricePerNight: 100, nights: 0, rooms: 1 })).toBe(0);
    expect(stayTotal({ pricePerNight: 0, nights: 3, rooms: 2 })).toBe(0);
  });
});

describe("lowestNightlyPrice", () => {
  it("hotel 1: R$ 800 (o hotel diz 1.200)", () => {
    expect(seedHotel(1).pricePerNight).toBe(1200);
    expect(lowestNightlyPrice(seedRooms(1))).toEqual({ price: 800, soldOut: false });
  });

  it("hotel 4: R$ 720 (o hotel diz 890)", () => {
    expect(seedHotel(4).pricePerNight).toBe(890);
    expect(lowestNightlyPrice(seedRooms(4))).toEqual({ price: 720, soldOut: false });
  });

  it("hotel 19 esgotado: menor diária de todos, com soldOut", () => {
    const rooms = seedRooms(19);
    expect(rooms.every((room) => room.available === 0)).toBe(true);
    expect(lowestNightlyPrice(rooms)).toEqual({
      price: Math.min(...rooms.map((room) => room.pricePerNight)),
      soldOut: true,
    });
  });

  it("ignora quartos esgotados mais baratos quando há estoque", () => {
    const rooms = [
      makeRoom({ id: 1, pricePerNight: 300, available: 0 }),
      makeRoom({ id: 2, pricePerNight: 500, available: 2 }),
      makeRoom({ id: 3, pricePerNight: 400, available: 1 }),
    ];
    expect(lowestNightlyPrice(rooms)).toEqual({ price: 400, soldOut: false });
  });

  it("sem quartos: null", () => {
    expect(lowestNightlyPrice([])).toBeNull();
  });
});

describe("stayTotalWithFees", () => {
  it("diária × noites × quartos + serviço 10% + ISS 5% (a conta do checkout)", () => {
    expect(stayTotalWithFees({ pricePerNight: 800, nights: 3, rooms: 1 })).toBe(2760);
    expect(stayTotalWithFees({ pricePerNight: 800, nights: 3, rooms: 2 })).toBe(5520);
  });

  it("bate com calculatePrice sem cupom (centavos)", () => {
    const total = stayTotalWithFees({ pricePerNight: 199.99, nights: 3, rooms: 1 });
    expect(total).toBe(centsToReais(feesOnBase(59_997).totalCents));
  });
});

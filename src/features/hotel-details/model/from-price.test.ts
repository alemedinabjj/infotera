import { describe, expect, it } from "vitest";
import { makeRoom } from "@/shared/testing/fixtures";
import { seedHotel, seedRooms } from "@/shared/testing/seed";
import { lowestNightlyPrice } from "./from-price";

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

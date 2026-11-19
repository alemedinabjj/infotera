import { describe, expect, it } from "vitest";
import { stayTotal } from "./stay-price";

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

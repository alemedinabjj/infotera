import { describe, expect, it } from "vitest";
import { toStayCriteria } from "./stay-criteria";

const VALID = {
  destination: "Rio de Janeiro, RJ",
  checkIn: "2026-12-12",
  checkOut: "2026-12-15",
  rooms: "1",
  adults: "2",
  children: "0",
};

describe("toStayCriteria", () => {
  it("devolve os critérios quando a URL é válida", () => {
    expect(toStayCriteria(VALID)).toMatchObject({
      destination: "Rio de Janeiro, RJ",
      checkIn: "2026-12-12",
      checkOut: "2026-12-15",
      rooms: 1,
      adults: 2,
      children: 0,
    });
  });

  it("devolve null sem parâmetros", () => {
    expect(toStayCriteria({})).toBeNull();
  });

  it("devolve null quando as datas são inválidas", () => {
    expect(toStayCriteria({ ...VALID, checkOut: "2026-12-10" })).toBeNull();
    expect(toStayCriteria({ ...VALID, checkIn: "ontem" })).toBeNull();
  });

  it("ignora chaves extras", () => {
    expect(toStayCriteria({ ...VALID, utm: "x" })).not.toBeNull();
  });
});

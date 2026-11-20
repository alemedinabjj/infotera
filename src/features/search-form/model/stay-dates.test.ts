import { describe, expect, it } from "vitest";
import { adjustCheckOut, dateBounds, stayNights } from "./stay-dates";

describe("adjustCheckOut", () => {
  it.each([
    ["check-out vazio → +1 sem aviso", "2026-12-12", "", "2026-12-13", false],
    ["check-out igual → +1 com aviso", "2026-12-12", "2026-12-12", "2026-12-13", true],
    ["check-out antes → +1 com aviso", "2026-12-12", "2026-12-01", "2026-12-13", true],
    ["virada de mês", "2026-12-31", "2026-12-20", "2027-01-01", true],
    ["fevereiro bissexto", "2028-02-28", "", "2028-02-29", false],
    ["check-out válido fica", "2026-12-12", "2026-12-15", "2026-12-15", false],
    ["mais de 30 noites fica", "2026-12-12", "2027-02-01", "2027-02-01", false],
    ["check-in vazio não mexe", "", "2026-12-15", "2026-12-15", false],
    ["check-in inválido não mexe", "2026-02-30", "", "", false],
  ])("%s", (_name, checkIn, checkOut, expected, adjusted) => {
    expect(adjustCheckOut(checkIn, checkOut)).toEqual({ checkOut: expected, adjusted });
  });
});

describe("dateBounds", () => {
  it("antes de hidratar não define nada", () => {
    expect(dateBounds(null, "")).toEqual({
      checkInMin: undefined,
      checkOutMin: undefined,
      checkOutMax: undefined,
    });
  });

  it("sem check-in: check-out começa amanhã e não tem máximo", () => {
    expect(dateBounds("2026-12-31", "")).toEqual({
      checkInMin: "2026-12-31",
      checkOutMin: "2027-01-01",
      checkOutMax: undefined,
    });
  });

  it("com check-in: +1 e +30 (virada de ano)", () => {
    expect(dateBounds("2026-12-01", "2026-12-20")).toEqual({
      checkInMin: "2026-12-01",
      checkOutMin: "2026-12-21",
      checkOutMax: "2027-01-19",
    });
  });
});

describe("stayNights", () => {
  it.each([
    ["2026-12-12", "2026-12-15", 3],
    ["2026-12-12", "2026-12-13", 1],
    ["2026-12-12", "2027-01-11", 30],
    ["2026-12-12", "2027-01-12", null],
    ["2026-12-12", "2026-12-12", null],
    ["2026-12-12", "2026-12-10", null],
    ["", "2026-12-12", null],
    ["2026-12-12", "", null],
  ])("%s → %s = %s", (checkIn, checkOut, expected) => {
    expect(stayNights(checkIn, checkOut)).toBe(expected);
  });
});

import { describe, expect, it } from "vitest";
import { type GuestCounts, guestHint, guestLimits } from "./guests";

const counts = (rooms: number, adults: number, children: number): GuestCounts => ({
  rooms,
  adults,
  children,
});

describe("guestLimits", () => {
  it.each([
    [counts(1, 2, 0), { rooms: [1, 2], adults: [1, 5], children: [0, 3] }],
    [counts(1, 5, 0), { rooms: [1, 4], adults: [1, 5], children: [0, 0] }],
    [counts(1, 2, 3), { rooms: [1, 2], adults: [1, 2], children: [0, 3] }],
    [counts(2, 2, 0), { rooms: [1, 2], adults: [2, 10], children: [0, 8] }],
    [counts(2, 4, 3), { rooms: [2, 4], adults: [2, 7], children: [0, 6] }],
    [counts(4, 16, 4), { rooms: [4, 4], adults: [4, 16], children: [0, 4] }],
    [counts(4, 4, 10), { rooms: [3, 4], adults: [4, 10], children: [0, 10] }],
  ])("%j", (value, expected) => {
    const limits = guestLimits(value);
    expect([limits.rooms.min, limits.rooms.max]).toEqual(expected.rooms);
    expect([limits.adults.min, limits.adults.max]).toEqual(expected.adults);
    expect([limits.children.min, limits.children.max]).toEqual(expected.children);
  });
});

describe("guestHint", () => {
  it("não mostra nada no estado padrão", () => {
    expect(guestHint("adults", counts(1, 2, 0))).toBeNull();
    expect(guestHint("children", counts(1, 2, 0))).toBeNull();
    expect(guestHint("rooms", counts(1, 2, 0))).toBeNull();
  });

  it("1 quarto cheio explica a capacidade e sugere adicionar quarto", () => {
    const capacity = "Até 5 hóspedes por quarto. Adicione um quarto para incluir mais pessoas.";
    expect(guestHint("adults", counts(1, 5, 0))).toBe(capacity);
    expect(guestHint("children", counts(1, 5, 0))).toBe(capacity);
    expect(guestHint("adults", counts(1, 3, 2))).toBe(capacity);
  });

  it("4 quartos cheios explicam o teto de quartos", () => {
    expect(guestHint("adults", counts(4, 16, 4))).toBe(
      "Até 5 hóspedes por quarto, em no máximo 4 quartos.",
    );
    expect(guestHint("children", counts(4, 16, 4))).toBe(
      "Até 5 hóspedes por quarto, em no máximo 4 quartos.",
    );
  });

  it("teto absoluto de adultos e crianças", () => {
    expect(guestHint("adults", counts(4, 16, 0))).toBe("Máximo de 16 adultos por busca.");
    expect(guestHint("children", counts(4, 4, 10))).toBe("Máximo de 10 crianças por busca.");
  });

  it("adultos no mínimo igual aos quartos", () => {
    expect(guestHint("adults", counts(2, 2, 0))).toBe(
      "Cada quarto precisa de pelo menos 1 adulto.",
    );
  });

  it("quartos no máximo", () => {
    expect(guestHint("rooms", counts(4, 4, 0))).toBe("Máximo de 4 quartos por busca.");
    expect(guestHint("rooms", counts(2, 2, 0))).toBe(
      "Cada quarto precisa de pelo menos 1 adulto. Adicione um adulto para incluir mais quartos.",
    );
  });

  it("quartos no mínimo por capacidade", () => {
    expect(guestHint("rooms", counts(2, 5, 2))).toBe(
      "Com 7 hóspedes, são necessários pelo menos 2 quartos.",
    );
  });
});

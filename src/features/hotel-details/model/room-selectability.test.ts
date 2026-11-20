import { describe, expect, it } from "vitest";
import { makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import {
  canSelect,
  type RoomSelectability,
  roomSelectability,
  selectabilityBadge,
  selectabilityMessage,
} from "./room-selectability";

const criteria = (overrides: Parameters<typeof makeSearchCriteria>[0] = {}) =>
  makeSearchCriteria({ rooms: 1, adults: 2, children: 0, ...overrides });

describe("roomSelectability: precedência", () => {
  it("esgotado vence tudo, até sem critérios", () => {
    expect(roomSelectability(makeRoom({ available: 0 }), null)).toEqual({ kind: "sold-out" });
    expect(
      roomSelectability(makeRoom({ available: 0, maxGuests: 1 }), criteria({ adults: 4 })),
    ).toEqual({
      kind: "sold-out",
    });
  });

  it("sem critérios (e com estoque) pede as datas", () => {
    expect(roomSelectability(makeRoom({ available: 5 }), null)).toEqual({ kind: "needs-dates" });
  });

  it("datas passadas pedem novas datas, depois do esgotado", () => {
    expect(roomSelectability(makeRoom({ available: 5 }), criteria(), true)).toEqual({
      kind: "past-dates",
    });
    expect(roomSelectability(makeRoom({ available: 0 }), criteria(), true)).toEqual({
      kind: "sold-out",
    });
    expect(roomSelectability(makeRoom({ available: 5 }), null, true)).toEqual({
      kind: "needs-dates",
    });
  });

  it("pequeno demais vence quartos insuficientes", () => {
    const room = makeRoom({ available: 1, maxGuests: 2 });
    expect(roomSelectability(room, criteria({ adults: 6, rooms: 2 }))).toEqual({
      kind: "too-small",
      maxGuests: 2,
      guestsPerRoom: 3,
    });
  });

  it("menos quartos que o pedido", () => {
    expect(
      roomSelectability(makeRoom({ available: 2 }), criteria({ rooms: 3, adults: 3 })),
    ).toEqual({
      kind: "insufficient",
      available: 2,
      requested: 3,
    });
  });

  it.each([
    [1, 1],
    [2, 2],
    [3, null],
    [8, null],
  ])("selecionável com %i disponíveis: scarce %s", (available, scarce) => {
    expect(roomSelectability(makeRoom({ available }), criteria())).toEqual({
      kind: "selectable",
      scarce,
    });
  });

  it("hóspedes por quarto arredonda para cima e aceita exatamente a capacidade", () => {
    const room = makeRoom({ maxGuests: 3, available: 5 });
    expect(roomSelectability(room, criteria({ adults: 3, children: 3, rooms: 2 })).kind).toBe(
      "selectable",
    );
    expect(roomSelectability(room, criteria({ adults: 4, children: 3, rooms: 2 })).kind).toBe(
      "too-small",
    );
  });
});

describe("mensagens e selos", () => {
  const cases: [string, RoomSelectability, boolean, string | null, string | null][] = [
    [
      "esgotado com datas",
      { kind: "sold-out" },
      true,
      "Sem quartos disponíveis para estas datas.",
      "Esgotado",
    ],
    [
      "esgotado sem datas",
      { kind: "sold-out" },
      false,
      "Sem quartos disponíveis no momento.",
      "Esgotado",
    ],
    [
      "pequeno",
      { kind: "too-small", maxGuests: 2, guestsPerRoom: 3 },
      true,
      "Acomoda até 2 hóspedes. Sua busca tem 3 por quarto. Escolha outro quarto ou altere os hóspedes.",
      null,
    ],
    [
      "pequeno (1 hóspede)",
      { kind: "too-small", maxGuests: 1, guestsPerRoom: 2 },
      true,
      "Acomoda 1 hóspede. Sua busca tem 2 por quarto. Escolha outro quarto ou altere os hóspedes.",
      null,
    ],
    [
      "insuficiente",
      { kind: "insufficient", available: 2, requested: 3 },
      true,
      "Sua busca pede 3 quartos. Diminua a quantidade de quartos ou escolha outro tipo.",
      "Só 2 disponíveis",
    ],
    ["escassez 1", { kind: "selectable", scarce: 1 }, true, null, "Apenas 1 quarto!"],
    ["escassez 2", { kind: "selectable", scarce: 2 }, true, null, "Apenas 2 quartos!"],
    ["normal", { kind: "selectable", scarce: null }, true, null, null],
    ["sem datas", { kind: "needs-dates" }, false, null, null],
    ["datas passadas", { kind: "past-dates" }, true, "As datas desta busca já passaram.", null],
  ];

  it.each(cases)("%s", (_name, selectability, hasDates, message, badge) => {
    expect(selectabilityMessage(selectability, hasDates)).toBe(message);
    expect(selectabilityBadge(selectability)?.text ?? null).toBe(badge);
  });

  it("não sugere outro quarto quando o hotel tem um só tipo", () => {
    expect(
      selectabilityMessage({ kind: "insufficient", available: 1, requested: 2 }, true, false),
    ).toBe("Sua busca pede 2 quartos. Diminua a quantidade de quartos.");
    expect(
      selectabilityMessage({ kind: "too-small", maxGuests: 2, guestsPerRoom: 3 }, true, false),
    ).toBe("Acomoda até 2 hóspedes. Sua busca tem 3 por quarto. Altere os hóspedes.");
  });

  it("tons dos selos e só 'selectable' seleciona", () => {
    expect(selectabilityBadge({ kind: "sold-out" })?.tone).toBe("danger");
    expect(selectabilityBadge({ kind: "selectable", scarce: 1 })?.tone).toBe("warning");
    expect(selectabilityBadge({ kind: "insufficient", available: 1, requested: 2 })?.text).toBe(
      "Só 1 disponível",
    );
    expect(canSelect({ kind: "selectable", scarce: null })).toBe(true);
    expect(canSelect({ kind: "needs-dates" })).toBe(false);
    expect(canSelect({ kind: "sold-out" })).toBe(false);
  });
});

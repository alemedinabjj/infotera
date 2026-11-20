import { describe, expect, it } from "vitest";
import { initialRoomCountState, limitHint, roomCountBounds, roomCountReducer } from "./room-count";

describe("roomCountBounds", () => {
  it("2 adultos no quarto 1: máximo 2 por causa dos adultos", () => {
    const bounds = roomCountBounds(
      { adults: 2, children: 0 },
      { available: 8, maxGuests: 3 },
      "pt-BR",
    );
    expect(bounds).toMatchObject({
      min: 1,
      max: 2,
      minHint: null,
      maxHint: "Cada quarto precisa de pelo menos 1 adulto.",
    });
  });

  it("4 adultos com maxGuests 3: mínimo 2 com o motivo", () => {
    const bounds = roomCountBounds(
      { adults: 4, children: 0 },
      { available: 8, maxGuests: 3 },
      "pt-BR",
    );
    expect(bounds.min).toBe(2);
    expect(bounds.minHint).toBe(
      "Este quarto acomoda até 3 hóspedes: 4 hóspedes precisam de pelo menos 2 quartos.",
    );
  });

  it("limite de 4 quartos por reserva", () => {
    const bounds = roomCountBounds(
      { adults: 6, children: 0 },
      { available: 8, maxGuests: 3 },
      "pt-BR",
    );
    expect(bounds.max).toBe(4);
    expect(bounds.maxHint).toBe("Máximo de 4 quartos por reserva.");
  });

  it("disponibilidade menor que os demais limites", () => {
    const bounds = roomCountBounds(
      { adults: 6, children: 0 },
      { available: 2, maxGuests: 4 },
      "pt-BR",
    );
    expect(bounds.max).toBe(2);
    expect(bounds.maxHint).toBe("Só 2 quartos disponíveis.");
    expect(
      roomCountBounds({ adults: 6, children: 0 }, { available: 1, maxGuests: 6 }, "pt-BR").maxHint,
    ).toBe("Só 1 quarto disponível.");
  });

  it("empate: adultos antes da disponibilidade", () => {
    const bounds = roomCountBounds(
      { adults: 2, children: 0 },
      { available: 2, maxGuests: 3 },
      "pt-BR",
    );
    expect(bounds.maxHint).toBe("Cada quarto precisa de pelo menos 1 adulto.");
  });

  it("nunca devolve max < min", () => {
    const bounds = roomCountBounds(
      { adults: 4, children: 0 },
      { available: 1, maxGuests: 2 },
      "pt-BR",
    );
    expect(bounds.max).toBeGreaterThanOrEqual(bounds.min);
  });
});

describe("limitHint", () => {
  const bounds = roomCountBounds(
    { adults: 4, children: 0 },
    { available: 8, maxGuests: 3 },
    "pt-BR",
  );

  it("mostra o motivo só no limite", () => {
    expect(limitHint(bounds, 2)).toBe(bounds.minHint);
    expect(limitHint(bounds, 3)).toBeNull();
    expect(limitHint(bounds, 4)).toBe(bounds.maxHint);
  });
});

describe("roomCountReducer", () => {
  const change = (value: number, state = initialRoomCountState(1)) =>
    roomCountReducer(state, { type: "change", value });

  it("clique muda o valor na hora e marca confirmando", () => {
    expect(change(2)).toMatchObject({ value: 2, confirmed: 1, seq: 1, status: "confirming" });
  });

  it("confirmação do último pedido fecha o ciclo", () => {
    const state = roomCountReducer(change(2), { type: "confirmed", seq: 1, value: 2 });
    expect(state).toMatchObject({ value: 2, confirmed: 2, status: "idle" });
  });

  it("rejeição volta ao último confirmado com o motivo", () => {
    const state = roomCountReducer(change(2), {
      type: "rejected",
      seq: 1,
      note: "Só 1 quarto disponível.",
    });
    expect(state).toMatchObject({ value: 1, status: "idle", note: "Só 1 quarto disponível." });
  });

  it("clique novo limpa o motivo anterior", () => {
    const rejected = roomCountReducer(change(2), { type: "rejected", seq: 1, note: "x" });
    expect(change(2, rejected).note).toBeNull();
  });

  it("rejeição de pedido velho é ignorada (último clique vence)", () => {
    const state = change(3, change(2));
    expect(roomCountReducer(state, { type: "rejected", seq: 1, note: "x" })).toEqual(state);
  });

  it("confirmação fora de ordem: a antiga não derruba a nova e o rollback vai ao último confirmado", () => {
    let state = change(3, change(2)); // seq 2
    state = roomCountReducer(state, { type: "confirmed", seq: 1, value: 2 });
    expect(state).toMatchObject({ confirmed: 2, status: "confirming" });
    state = roomCountReducer(state, { type: "rejected", seq: 2, note: "n" });
    expect(state).toMatchObject({ value: 2, confirmed: 2, status: "idle" });
  });

  it("confirmação atrasada de pedido velho não regride o confirmado", () => {
    let state = change(3, change(2));
    state = roomCountReducer(state, { type: "confirmed", seq: 2, value: 3 });
    state = roomCountReducer(state, { type: "confirmed", seq: 1, value: 2 });
    expect(state).toMatchObject({ value: 3, confirmed: 3, status: "idle" });
  });
});

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useBookingDraft,
  useBookingDraftActions,
  useBookingDraftHydrated,
  useSelection,
} from "./booking-draft";

const KEY = "infotera:booking-draft";
const criteria = {
  destination: "São Paulo, SP",
  checkIn: "2026-12-10",
  checkOut: "2026-12-13",
  rooms: 1,
  adults: 2,
  children: 0,
};

const readStored = (): unknown => {
  const raw = window.sessionStorage.getItem(KEY);
  return raw === null ? null : JSON.parse(raw);
};

beforeEach(() => {
  window.sessionStorage.clear();
  useBookingDraft.setState({ selection: null });
});

describe("booking-draft", () => {
  // Primeiro teste: o módulo ainda não reidratou (hasHydrated é estado do singleton).
  it("useBookingDraftHydrated é false antes do rehydrate", () => {
    const { result } = renderHook(() => useBookingDraftHydrated());
    expect(result.current).toBe(false);
  });

  it("grava só selection (ids + critérios) e version 1, sem PII", () => {
    useBookingDraftActions().selectRoom({ hotelId: 1, roomId: 2, criteria });
    const stored = readStored();
    expect(stored).toEqual({
      state: { selection: { hotelId: 1, roomId: 2, criteria } },
      version: 1,
    });
    expect(Object.keys(stored as object).sort()).toEqual(["state", "version"]);
    const keys = JSON.stringify(stored).match(/"[A-Za-z]+":/g) ?? [];
    expect(keys.join("")).not.toMatch(/email|phone|cpf|card/i);
  });

  it("reidrata a seleção salva", async () => {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({ state: { selection: { hotelId: 3, roomId: 4, criteria } }, version: 1 }),
    );
    await useBookingDraft.persist.rehydrate();
    expect(useBookingDraft.getState().selection).toEqual({ hotelId: 3, roomId: 4, criteria });
  });

  it.each([
    ["JSON corrompido", "{not json"],
    [
      "hotelId inválido",
      JSON.stringify({ state: { selection: { hotelId: "x", roomId: 1, criteria } }, version: 1 }),
    ],
    [
      "versão desconhecida",
      JSON.stringify({ state: { selection: { hotelId: 1, roomId: 1, criteria } }, version: 99 }),
    ],
  ])("%s resulta em { selection: null } sem lançar", async (_name, raw) => {
    window.sessionStorage.setItem(KEY, raw);
    await expect(useBookingDraft.persist.rehydrate()).resolves.not.toThrow();
    expect(useBookingDraft.getState().selection).toBeNull();
  });

  it("JSON corrompido ainda marca hasHydrated e limpa a chave", async () => {
    window.sessionStorage.setItem(KEY, "{corrompido");
    await useBookingDraft.persist.rehydrate();
    expect(useBookingDraft.persist.hasHydrated()).toBe(true);
    expect(useBookingDraft.getState().selection).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("sessionStorage inacessível não derruba rehydrate, ações nem hooks", async () => {
    const spy = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    try {
      await expect(useBookingDraft.persist.rehydrate()).resolves.not.toThrow();
      expect(useBookingDraft.persist.hasHydrated()).toBe(true);
      const { result } = renderHook(() => useSelection());
      expect(result.current).toBeNull();
      expect(() => {
        useBookingDraftActions().selectRoom({ hotelId: 1, roomId: 2, criteria });
        useBookingDraftActions().clearSelection();
      }).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it("clearSelection zera estado e storage", () => {
    const actions = useBookingDraftActions();
    actions.selectRoom({ hotelId: 1, roomId: 2, criteria });
    actions.clearSelection();
    expect(useBookingDraft.getState().selection).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("useSelection reflete o store", () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current).toBeNull();
    act(() => useBookingDraftActions().selectRoom({ hotelId: 1, roomId: 2, criteria }));
    expect(result.current?.roomId).toBe(2);
  });

  it("useBookingDraftHydrated vai de false para true após o rehydrate", async () => {
    const { result } = renderHook(() => useBookingDraftHydrated());
    await act(async () => {
      await useBookingDraft.persist.rehydrate();
    });
    expect(result.current).toBe(true);
  });

  describe("setRoomCount", () => {
    it("grava e persiste a nova quantidade quando os critérios continuam válidos", () => {
      useBookingDraftActions().selectRoom({
        hotelId: 1,
        roomId: 2,
        criteria: { ...criteria, adults: 3 },
      });
      expect(useBookingDraftActions().setRoomCount(3)).toBe(true);
      expect(useBookingDraft.getState().selection?.criteria.rooms).toBe(3);
      expect(readStored()).toMatchObject({ state: { selection: { criteria: { rooms: 3 } } } });
    });

    it.each([
      ["menos adultos que quartos", { adults: 2, children: 0 }, 3],
      ["mais de 5 hóspedes por quarto", { adults: 8, children: 3 }, 2],
      ["mais de 4 quartos", { adults: 8, children: 0 }, 5],
    ])("devolve false e não muda: %s", (_name, guests, rooms) => {
      const selection = { hotelId: 1, roomId: 2, criteria: { ...criteria, ...guests, rooms: 1 } };
      useBookingDraftActions().selectRoom(selection);
      expect(useBookingDraftActions().setRoomCount(rooms)).toBe(false);
      expect(useBookingDraft.getState().selection).toEqual(selection);
    });

    it("sem seleção devolve false", () => {
      expect(useBookingDraftActions().setRoomCount(1)).toBe(false);
      expect(useBookingDraft.getState().selection).toBeNull();
    });
  });
});

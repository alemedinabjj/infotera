import { beforeEach, describe, expect, it, vi } from "vitest";
import { FAVORITES_STORAGE_KEY, favoritesActions, useFavoritesStore } from "./favorites";

const stored = () => JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "null");

beforeEach(() => {
  window.localStorage.clear();
  useFavoritesStore.setState({ items: [] });
});

describe("favorites store", () => {
  it("toggle persiste só id e addedAt", () => {
    expect(favoritesActions.toggle(4, new Date("2026-11-19T10:00:00.000Z"))).toBe("added");
    expect(stored().state.items).toEqual([{ id: 4, addedAt: "2026-11-19T10:00:00.000Z" }]);
    expect(favoritesActions.toggle(4)).toBe("removed");
    expect(stored().state.items).toEqual([]);
  });

  it("restore devolve o addedAt original", () => {
    favoritesActions.toggle(4, new Date("2026-11-19T10:00:00.000Z"));
    favoritesActions.toggle(4);
    favoritesActions.restore({ id: 4, addedAt: "2026-11-19T10:00:00.000Z" });
    expect(useFavoritesStore.getState().items).toEqual([
      { id: 4, addedAt: "2026-11-19T10:00:00.000Z" },
    ]);
  });

  it("reidrata saneando por item (id 999 válido fica, inválido sai)", async () => {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          items: [
            { id: 999, addedAt: "2026-11-02T10:00:00.000Z" },
            { id: "x", addedAt: "?" },
            { id: 1, addedAt: "2026-11-01T10:00:00.000Z" },
          ],
        },
      }),
    );
    await useFavoritesStore.persist.rehydrate();
    expect(useFavoritesStore.getState().items.map((item) => item.id)).toEqual([999, 1]);
  });

  it("prune remove os ids pedidos e regrava o storage saneado", async () => {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { items: [{ id: 999, addedAt: "2026-11-02T10:00:00.000Z" }, { id: 1 }] },
      }),
    );
    await useFavoritesStore.persist.rehydrate();
    favoritesActions.prune([999]);
    expect(stored().state.items).toEqual([]);
  });

  it("limite de 100 devolve limit e não muda nada", () => {
    for (let id = 1; id <= 100; id++) favoritesActions.toggle(id);
    expect(favoritesActions.toggle(101)).toBe("limit");
    expect(useFavoritesStore.getState().items).toHaveLength(100);
  });

  it("não lança quando o storage lança", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cota");
    });
    expect(() => favoritesActions.toggle(1)).not.toThrow();
    expect(useFavoritesStore.getState().items).toHaveLength(1);
  });

  it("JSON corrompido no storage vira lista vazia", async () => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, "{nao-json");
    await useFavoritesStore.persist.rehydrate();
    expect(useFavoritesStore.getState().items).toEqual([]);
  });
});

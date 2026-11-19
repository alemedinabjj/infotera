import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { COMPARISON_STORAGE_KEY, useComparisonStore } from "../saved/stores/comparison";
import { FAVORITES_STORAGE_KEY, useFavoritesStore } from "../saved/stores/favorites";
import { StoreHydrator } from "./StoreHydrator";

const persisted = (items: unknown[]) => JSON.stringify({ version: 1, state: { items } });

beforeEach(() => {
  window.localStorage.clear();
  useFavoritesStore.setState({ items: [] });
  useComparisonStore.setState({ items: [] });
});

describe("StoreHydrator", () => {
  it("reidrata favoritos e comparação no mount", async () => {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      persisted([{ id: 3, addedAt: "2026-11-01T10:00:00.000Z" }]),
    );
    window.localStorage.setItem(COMPARISON_STORAGE_KEY, persisted([{ id: 3, name: "Hotel 3" }]));
    render(<StoreHydrator />);
    await act(async () => undefined);
    expect(useFavoritesStore.getState().items).toHaveLength(1);
    expect(useComparisonStore.getState().items).toHaveLength(1);
  });

  it("evento storage de uma chave reidrata só o store daquela chave", async () => {
    render(<StoreHydrator />);
    await act(async () => undefined);
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      persisted([{ id: 9, addedAt: "2026-11-01T10:00:00.000Z" }]),
    );
    window.localStorage.setItem(COMPARISON_STORAGE_KEY, persisted([{ id: 9, name: "Hotel 9" }]));
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: FAVORITES_STORAGE_KEY }));
    });
    expect(useFavoritesStore.getState().items.map((item) => item.id)).toEqual([9]);
    expect(useComparisonStore.getState().items).toEqual([]);
  });

  it("para de ouvir ao desmontar", async () => {
    const { unmount } = render(<StoreHydrator />);
    await act(async () => undefined);
    unmount();
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      persisted([{ id: 9, addedAt: "2026-11-01T10:00:00.000Z" }]),
    );
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: FAVORITES_STORAGE_KEY }));
    });
    expect(useFavoritesStore.getState().items).toEqual([]);
  });
});

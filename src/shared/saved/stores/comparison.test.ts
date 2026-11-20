import { beforeEach, describe, expect, it } from "vitest";
import { COMPARISON_STORAGE_KEY, comparisonActions, useComparisonStore } from "./comparison";

const hotel = (id: number) => ({ id, name: `Hotel ${id}` });

beforeEach(() => {
  window.localStorage.clear();
  useComparisonStore.setState({ items: [] });
});

describe("comparison store", () => {
  it("o 4º hotel volta full e não entra", () => {
    for (const id of [1, 4, 7]) comparisonActions.toggle(hotel(id));
    expect(comparisonActions.toggle(hotel(9))).toBe("full");
    expect(useComparisonStore.getState().items.map((item) => item.id)).toEqual([1, 4, 7]);
  });

  it("remove, limpa e restaura tudo", () => {
    for (const id of [1, 4, 7]) comparisonActions.toggle(hotel(id));
    comparisonActions.remove(4);
    expect(useComparisonStore.getState().items.map((item) => item.id)).toEqual([1, 7]);
    const previous = comparisonActions.clear();
    expect(useComparisonStore.getState().items).toEqual([]);
    comparisonActions.restoreAll(previous);
    expect(useComparisonStore.getState().items.map((item) => item.id)).toEqual([1, 7]);
  });

  it("reidrata cortando em 3 e descartando itens inválidos", async () => {
    window.localStorage.setItem(
      COMPARISON_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { items: [hotel(1), { id: 2 }, hotel(3), hotel(4), hotel(5)] },
      }),
    );
    await useComparisonStore.persist.rehydrate();
    expect(useComparisonStore.getState().items.map((item) => item.id)).toEqual([1, 3, 4]);
  });
});

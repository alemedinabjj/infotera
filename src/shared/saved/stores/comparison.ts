import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createRawStorage } from "../../lib/storage";
import {
  type CompareEntry,
  type CompareToggleResult,
  sanitizeComparison,
  toggleCompare,
} from "../model/comparison";

export const COMPARISON_STORAGE_KEY = "infotera:comparison";

type ComparisonState = { items: CompareEntry[] };

const initialState: ComparisonState = { items: [] };

const readItems = (persisted: unknown): unknown =>
  typeof persisted === "object" && persisted !== null && "items" in persisted
    ? persisted.items
    : [];

/** Seleção da comparação (até 3, `{ id, name }`), persistida em `localStorage` e sincronizada entre abas. */
export const useComparisonStore = create<ComparisonState>()(
  persist(() => initialState, {
    name: COMPARISON_STORAGE_KEY,
    version: 1,
    storage: createJSONStorage(() => createRawStorage("local")),
    skipHydration: true,
    partialize: (state): ComparisonState => ({ items: state.items }),
    migrate: (persisted) => ({ items: sanitizeComparison(readItems(persisted)) }),
    merge: (persisted, current) => ({
      ...current,
      items: sanitizeComparison(readItems(persisted)),
    }),
  }),
);

export const comparisonActions = {
  toggle: (entry: CompareEntry): CompareToggleResult => {
    const { list, result } = toggleCompare(useComparisonStore.getState().items, entry);
    if (result !== "full") useComparisonStore.setState({ items: list });
    return result;
  },
  remove: (id: number): void => {
    useComparisonStore.setState((state) => ({
      items: state.items.filter((entry) => entry.id !== id),
    }));
  },
  clear: (): CompareEntry[] => {
    const previous = useComparisonStore.getState().items;
    useComparisonStore.setState({ items: [] });
    return previous;
  },
  /** Desfazer "Limpar comparação": volta a lista capturada no momento. */
  restoreAll: (items: readonly CompareEntry[]): void => {
    useComparisonStore.setState({ items: sanitizeComparison([...items]) });
  },
};

export const useComparison = (): CompareEntry[] => useComparisonStore((state) => state.items);

export const useIsCompared = (id: number): boolean =>
  useComparisonStore((state) => state.items.some((entry) => entry.id === id));

export const useComparisonHydrated = (): boolean =>
  useSyncExternalStore(
    (onChange) => useComparisonStore.persist.onFinishHydration(onChange),
    () => useComparisonStore.persist.hasHydrated(),
    () => false,
  );

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { createRawStorage, createStorage, STORAGE_PREFIX } from "@/shared/lib/storage";
import {
  addRecentSearch,
  parseRecentSearchesJson,
  RECENT_SEARCHES_KEY,
} from "../model/recent-searches";

const KEY = STORAGE_PREFIX + RECENT_SEARCHES_KEY;
const storage = createStorage("local");
const rawStorage = createRawStorage("local");
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

// O snapshot é a string crua do storage (ou `null`): estável por valor, como o
// `useSyncExternalStore` exige. O parse/validação acontece uma vez por valor, no `useMemo`.
const getSnapshot = (): string | null => rawStorage.getItem(KEY);
const getServerSnapshot = (): string | null => null;

type RecentSearches = {
  items: SearchCriteria[];
  add: (criteria: SearchCriteria) => void;
  clear: () => void;
};

/**
 * Últimas buscas em localStorage. No servidor e na hidratação a lista é vazia (sem mismatch);
 * depois o valor salvo entra pelo `useSyncExternalStore`. Storage indisponível = lista vazia.
 */
export const useRecentSearches = (): RecentSearches => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const items = useMemo(() => parseRecentSearchesJson(snapshot), [snapshot]);

  const add = useCallback((criteria: SearchCriteria) => {
    storage.write(
      RECENT_SEARCHES_KEY,
      addRecentSearch(parseRecentSearchesJson(rawStorage.getItem(KEY)), criteria),
    );
    notify();
  }, []);

  const clear = useCallback(() => {
    storage.remove(RECENT_SEARCHES_KEY);
    notify();
  }, []);

  return { items, add, clear };
};

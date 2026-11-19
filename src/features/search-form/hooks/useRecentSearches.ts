import { useCallback, useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { createStorage } from "@/shared/lib/storage";
import {
  addRecentSearch,
  parseRecentSearches,
  RECENT_SEARCHES_KEY,
} from "../model/recent-searches";

const storage = createStorage("local");
const rawListSchema = z.array(z.unknown());
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

// O snapshot é o JSON (string): estável por valor, como o `useSyncExternalStore` exige.
const getSnapshot = (): string =>
  JSON.stringify(storage.read(RECENT_SEARCHES_KEY, rawListSchema, []));
const getServerSnapshot = (): string => "[]";

const readList = (): SearchCriteria[] =>
  parseRecentSearches(storage.read(RECENT_SEARCHES_KEY, rawListSchema, []));

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
  const items = useMemo(
    () => parseRecentSearches(rawListSchema.parse(JSON.parse(snapshot))),
    [snapshot],
  );

  const add = useCallback((criteria: SearchCriteria) => {
    storage.write(RECENT_SEARCHES_KEY, addRecentSearch(readList(), criteria));
    notify();
  }, []);

  const clear = useCallback(() => {
    storage.remove(RECENT_SEARCHES_KEY);
    notify();
  }, []);

  return { items, add, clear };
};

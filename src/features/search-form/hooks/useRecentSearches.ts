import { useCallback, useEffect, useState } from "react";
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

const readList = (): SearchCriteria[] =>
  parseRecentSearches(storage.read(RECENT_SEARCHES_KEY, rawListSchema, []));

type RecentSearches = {
  items: SearchCriteria[];
  add: (criteria: SearchCriteria) => void;
  clear: () => void;
};

/**
 * Últimas buscas em localStorage. O 1º render (e o servidor) é lista vazia; a leitura acontece
 * em `useEffect` para não gerar mismatch de hidratação.
 */
export const useRecentSearches = (): RecentSearches => {
  const [items, setItems] = useState<SearchCriteria[]>([]);

  useEffect(() => {
    setItems(readList());
  }, []);

  const add = useCallback((criteria: SearchCriteria) => {
    const next = addRecentSearch(readList(), criteria);
    storage.write(RECENT_SEARCHES_KEY, next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    storage.remove(RECENT_SEARCHES_KEY);
    setItems([]);
  }, []);

  return { items, add, clear };
};

"use client";

import { useSyncExternalStore } from "react";
import { type SearchCriteria, searchCriteriaSchema } from "./search-params";
import { createStorage, STORAGE_PREFIX } from "./storage";

/** Chave no `sessionStorage` (`infotera:last-search`). */
export const LAST_SEARCH_KEY = "last-search";

const storage = createStorage("session");

/**
 * Guarda os critérios da última busca vista (só destino, datas e hóspedes: nada pessoal), para que
 * comparação e favoritos levem o usuário ao hotel com as mesmas datas.
 */
export const rememberSearch = (criteria: SearchCriteria): void =>
  storage.write(LAST_SEARCH_KEY, criteria);

/** Última busca guardada, ou `null` (ausente, inválida ou storage indisponível). */
export const readLastSearch = (): SearchCriteria | null =>
  storage.read(LAST_SEARCH_KEY, searchCriteriaSchema.nullable(), null);

const rawValue = (): string | null => {
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + LAST_SEARCH_KEY);
  } catch {
    return null;
  }
};

let cache: { raw: string | null; value: SearchCriteria | null } = { raw: null, value: null };

const snapshot = (): SearchCriteria | null => {
  const raw = rawValue();
  if (raw !== cache.raw) cache = { raw, value: raw === null ? null : readLastSearch() };
  return cache.value;
};

const subscribe = (notify: () => void): (() => void) => {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
};

/** Última busca como valor reativo (estável entre renders); `null` no servidor e na hidratação. */
export const useLastSearch = (): SearchCriteria | null =>
  useSyncExternalStore(subscribe, snapshot, () => null);

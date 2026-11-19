import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createRawStorage } from "../../lib/storage";
import {
  type FavoriteEntry,
  restoreFavorite,
  sanitizeFavorites,
  type ToggleResult,
  toggleFavorite,
} from "../model/favorites";

export const FAVORITES_STORAGE_KEY = "infotera:favorites";

type FavoritesState = { items: FavoriteEntry[] };

const initialState: FavoritesState = { items: [] };

/**
 * Favoritos persistidos em `localStorage` (só `{ id, addedAt }`), com `skipHydration`: o
 * `StoreHydrator` reidrata no cliente e ouve o evento `storage` das outras abas.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(() => initialState, {
    name: FAVORITES_STORAGE_KEY,
    version: 1,
    storage: createJSONStorage(() => createRawStorage("local")),
    skipHydration: true,
    partialize: (state): FavoritesState => ({ items: state.items }),
    migrate: (persisted) => ({ items: sanitizeFavorites(readItems(persisted)) }),
    merge: (persisted, current) => ({ ...current, items: sanitizeFavorites(readItems(persisted)) }),
  }),
);

const readItems = (persisted: unknown): unknown =>
  typeof persisted === "object" && persisted !== null && "items" in persisted
    ? persisted.items
    : [];

export const favoritesActions = {
  toggle: (id: number, now: Date = new Date()): ToggleResult => {
    const { list, result } = toggleFavorite(useFavoritesStore.getState().items, id, now);
    if (result !== "limit") useFavoritesStore.setState({ items: list });
    return result;
  },
  restore: (entry: FavoriteEntry): void => {
    useFavoritesStore.setState((state) => ({ items: restoreFavorite(state.items, entry) }));
  },
  /** Tira os ids que a API não devolveu e regrava o storage já saneado. Nunca em erro de rede. */
  prune: (ids: readonly number[]): void => {
    const removed = new Set(ids);
    useFavoritesStore.setState((state) => ({
      items: state.items.filter((entry) => !removed.has(entry.id)),
    }));
  },
};

export const useFavorites = (): FavoriteEntry[] => useFavoritesStore((state) => state.items);

export const useIsFavorite = (id: number): boolean =>
  useFavoritesStore((state) => state.items.some((entry) => entry.id === id));

export const useFavoriteCount = (): number => useFavoritesStore((state) => state.items.length);

/** `true` depois que o storage foi lido (antes disso o store está vazio no servidor e no cliente). */
export const useFavoritesHydrated = (): boolean =>
  useSyncExternalStore(
    (onChange) => useFavoritesStore.persist.onFinishHydration(onChange),
    () => useFavoritesStore.persist.hasHydrated(),
    () => false,
  );

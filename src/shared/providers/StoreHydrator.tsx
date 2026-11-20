"use client";

import { useEffect } from "react";
import { COMPARISON_STORAGE_KEY, useComparisonStore } from "../saved/stores/comparison";
import { FAVORITES_STORAGE_KEY, useFavoritesStore } from "../saved/stores/favorites";
import { useBookingDraft } from "../stores/booking-draft";

/** Stores de `localStorage` que outra aba pode alterar: a chave do evento escolhe qual reidratar. */
const SYNCED_STORES = [
  { key: FAVORITES_STORAGE_KEY, rehydrate: () => useFavoritesStore.persist.rehydrate() },
  { key: COMPARISON_STORAGE_KEY, rehydrate: () => useComparisonStore.persist.rehydrate() },
] as const;

/**
 * Reidrata os stores persistidos (rascunho da reserva, favoritos e comparação) depois da
 * montagem no cliente, para o HTML do servidor (stores vazios) não divergir do primeiro render.
 * Ouve o evento `storage`: se outra aba gravou uma chave, só o store daquela chave reidrata.
 */
export const StoreHydrator = () => {
  useEffect(() => {
    void useBookingDraft.persist.rehydrate();
    for (const store of SYNCED_STORES) void store.rehydrate();

    const onStorage = (event: StorageEvent) => {
      // `key === null`: `localStorage.clear()` em outra aba.
      for (const store of SYNCED_STORES) {
        if (event.key === null || event.key === store.key) void store.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
};

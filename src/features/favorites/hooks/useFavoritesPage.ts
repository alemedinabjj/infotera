"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { missingIds } from "@/shared/api/ids";
import { hotelsByIdsQueryOptions, roomsByHotelsQueryOptions } from "@/shared/api/queries";
import type { Hotel } from "@/shared/api/schemas";
import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { lowestNightlyPrice } from "@/shared/lib/pricing";
import {
  type FavoriteEntry,
  favoritesActions,
  useFavorites,
  useFavoritesHydrated,
} from "@/shared/saved";
import {
  deriveFavoritesView,
  type FavoritesView,
  orderBySnapshot,
  type PriceState,
} from "../model/favorites-view";

type FavoritesPage = {
  view: FavoritesView;
  /** Hotéis na ordem do snapshot (mais recente primeiro). */
  hotels: Hotel[];
  /** Entradas do snapshot por id: o "Desfazer" restaura com o `addedAt` original. */
  entries: ReadonlyMap<number, FavoriteEntry>;
  /** Favoritos atuais (muda ao remover; o snapshot da página não). */
  liveCount: number;
  slow: boolean;
  retrying: boolean;
  retry: () => void;
  /** Preço "a partir de" de um hotel, pelos quartos (não pelo `pricePerNight` do hotel). */
  priceOf: (hotelId: number) => PriceState;
};

/**
 * Dados da página. O snapshot de ids é tirado **uma vez**, quando o storage é lido: remover um
 * favorito aqui não tira o card da lista (vira "fantasma" com Desfazer), então nada se move. Depois
 * da resposta, ids que a API não devolveu saem do storage (em erro/offline nunca se apaga nada).
 */
export const useFavoritesPage = (): FavoritesPage => {
  const hydrated = useFavoritesHydrated();
  const favorites = useFavorites();
  const [snapshot, setSnapshot] = useState<FavoriteEntry[] | null>(null);
  if (hydrated && snapshot === null) setSnapshot(favorites);

  const ids = useMemo(() => (snapshot ?? []).map((entry) => entry.id), [snapshot]);
  const entries = useMemo(
    () => new Map((snapshot ?? []).map((entry) => [entry.id, entry])),
    [snapshot],
  );
  const query = useQuery(hotelsByIdsQueryOptions(ids));
  const rooms = useQuery(roomsByHotelsQueryOptions(ids));
  const view = deriveFavoritesView({
    hydrated: hydrated && snapshot !== null,
    count: ids.length,
    status: query.status,
    fetchStatus: query.fetchStatus,
  });
  const slow = useSlowLoading(view === "loading" || view === "hydrating");

  const { data } = query;
  // Idempotente: a cada resposta tira do storage o que a API não devolveu (e regrava saneado).
  useEffect(() => {
    if (data) favoritesActions.prune(missingIds(ids, data));
  }, [data, ids]);

  return {
    view,
    hotels: orderBySnapshot(data ?? [], ids),
    entries,
    liveCount: favorites.length,
    slow,
    retrying: query.isFetching && view === "error",
    retry: () => void query.refetch(),
    priceOf: (hotelId) => {
      if (rooms.isError) return { state: "unavailable" };
      if (!rooms.data) return { state: "loading" };
      const from = lowestNightlyPrice(rooms.data.filter((room) => room.hotelId === hotelId));
      return from ? { state: "ready", nightly: from.price } : { state: "unavailable" };
    },
  };
};

"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { missingIds } from "@/shared/api/ids";
import { hotelsByIdsQueryOptions } from "@/shared/api/queries";
import type { Hotel } from "@/shared/api/schemas";
import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import {
  type FavoriteEntry,
  favoritesActions,
  useFavorites,
  useFavoritesHydrated,
} from "@/shared/saved";
import { deriveFavoritesView, type FavoritesView, orderBySnapshot } from "../model/favorites-view";

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
  const view = deriveFavoritesView({
    hydrated: hydrated && snapshot !== null,
    count: ids.length,
    status: query.status,
    fetchStatus: query.fetchStatus,
  });
  const slow = useSlowLoading(view === "loading" || view === "hydrating");

  const { data, dataUpdatedAt } = query;
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda uma vez por resposta (dataUpdatedAt)
  useEffect(() => {
    if (data) favoritesActions.prune(missingIds(ids, data));
  }, [dataUpdatedAt]);

  return {
    view,
    hotels: orderBySnapshot(data ?? [], ids),
    entries,
    liveCount: favorites.length,
    slow,
    retrying: query.isFetching && view === "error",
    retry: () => void query.refetch(),
  };
};

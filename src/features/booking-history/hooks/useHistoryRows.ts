"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { bookingQueryOptions, hotelsByIdsQueryOptions } from "@/shared/api/queries";
import type { Hotel } from "@/shared/api/schemas";
import { type BookingHistoryEntry, removeManyFromHistory } from "@/shared/lib/booking-history";
import { classifyHistoryResults, type HistoryRow } from "../model/history-rows";
import { useBookingHistory, useHydrated } from "./useBookingHistory";

type HotelLookup = { state: "loading" | "ready" | "unavailable"; hotels: readonly Hotel[] };

export type HistoryRows = {
  hydrated: boolean;
  /** Linhas na ordem do snapshot (sem as que deram 404). */
  rows: HistoryRow[];
  /** Ids ainda guardados (muda ao remover; o snapshot da página não). */
  liveIds: ReadonlySet<string>;
  hotels: HotelLookup;
  vanished: number;
  /** Tira um novo retrato do storage (depois de limpar ou de desfazer a limpeza). */
  resetSnapshot: () => void;
  retry: (id: string) => void;
  retrying: (id: string) => boolean;
};

/**
 * Um `GET /bookings/:id` por id do snapshot (até 10, em paralelo). **Só o 404** tira o id do
 * storage (uma vez) e vira aviso; erro de rede/5xx/offline nunca apaga. Os nomes dos hotéis vêm de
 * **um** `GET /hotels?id=…`, pedido quando nenhuma reserva está pendente (uma consulta só).
 */
export const useHistoryRows = (): HistoryRows => {
  const live = useBookingHistory();
  const hydrated = useHydrated();
  const [snapshot, setSnapshot] = useState<readonly BookingHistoryEntry[] | null>(null);
  if (hydrated && snapshot === null) setSnapshot(live);

  const entries = snapshot ?? [];
  const results = useQueries({
    queries: entries.map((entry) => bookingQueryOptions(entry.id)),
  });
  const all = classifyHistoryResults(
    entries,
    results.map((result) => ({
      status: result.status,
      data: result.data,
      error: result.error,
      paused: result.fetchStatus === "paused",
    })),
  );
  const settled = all.every((row) => row.kind !== "pending");
  const hotelIds = settled
    ? [...new Set(all.flatMap((row) => (row.kind === "found" ? [row.booking.hotelId] : [])))]
    : [];
  const hotelsQuery = useQuery(hotelsByIdsQueryOptions(hotelIds));

  const missingIds = all.flatMap((row) => (row.kind === "missing" ? [row.entry.id] : []));
  const handled = useRef(new Set<string>());
  const [vanished, setVanished] = useState(0);
  const missingKey = missingIds.join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `missingKey` resume `missingIds`
  useEffect(() => {
    const fresh = missingIds.filter((id) => !handled.current.has(id));
    if (fresh.length === 0) return;
    for (const id of fresh) handled.current.add(id);
    removeManyFromHistory(fresh);
    setVanished((count) => count + fresh.length);
  }, [missingKey]);

  const hotels: HotelLookup = useMemo(() => {
    if (hotelIds.length === 0 && settled) return { state: "ready", hotels: [] };
    if (hotelsQuery.isSuccess) return { state: "ready", hotels: hotelsQuery.data };
    return { state: hotelsQuery.isError ? "unavailable" : "loading", hotels: [] };
  }, [hotelIds.length, settled, hotelsQuery.isSuccess, hotelsQuery.isError, hotelsQuery.data]);

  return {
    hydrated: hydrated && snapshot !== null,
    rows: all.filter((row) => row.kind !== "missing"),
    liveIds: new Set(live.map((entry) => entry.id)),
    hotels,
    vanished,
    resetSnapshot: () => setSnapshot(null),
    retry: (id) => {
      const index = entries.findIndex((entry) => entry.id === id);
      void results[index]?.refetch();
    },
    retrying: (id) => {
      const index = entries.findIndex((entry) => entry.id === id);
      return results[index]?.isFetching ?? false;
    },
  };
};

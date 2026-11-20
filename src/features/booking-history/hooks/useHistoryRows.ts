"use client";

import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { bookingQueryOptions } from "@/shared/api/queries";
import type { BookingHistoryEntry } from "@/shared/lib/booking-history";
import { classifyHistoryResults, type HistoryRow } from "../model/history-rows";
import { useBookingHistory, useHydrated } from "./useBookingHistory";
import { type HotelLookup, useHistoryHotels } from "./useHistoryHotels";
import { usePruneMissing } from "./usePruneMissing";

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
 * **um** `GET /hotels?id=…` das reservas já encontradas (`useHistoryHotels`).
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
      failedBefore: result.errorUpdateCount > 0,
    })),
  );
  const settled = all.every((row) => row.kind !== "pending");
  const hotels = useHistoryHotels(all, settled);
  const vanished = usePruneMissing(all);

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

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { hotelsByIdsQueryOptions } from "@/shared/api/queries";
import type { Hotel } from "@/shared/api/schemas";
import type { HistoryRow } from "../model/history-rows";

export type HotelLookup = {
  state: "loading" | "ready" | "unavailable";
  hotels: readonly Hotel[];
};

const foundHotelIds = (rows: readonly HistoryRow[]): number[] => [
  ...new Set(rows.flatMap((row) => (row.kind === "found" ? [row.booking.hotelId] : []))),
];

/**
 * Nomes dos hotéis das reservas **já encontradas** (um `GET /hotels?id=…`). Não espera as demais
 * linhas; `keepPreviousData` mantém os nomes na tela enquanto a lista de ids cresce ou refaz.
 */
export const useHistoryHotels = (rows: readonly HistoryRow[], settled: boolean): HotelLookup => {
  const hotelIds = foundHotelIds(rows);
  const query = useQuery({
    ...hotelsByIdsQueryOptions(hotelIds),
    placeholderData: keepPreviousData,
  });
  if (hotelIds.length === 0) return { state: settled ? "ready" : "loading", hotels: [] };
  if (query.isError) return { state: "unavailable", hotels: query.data ?? [] };
  if (query.data === undefined) return { state: "loading", hotels: [] };
  return { state: query.isPlaceholderData ? "loading" : "ready", hotels: query.data };
};

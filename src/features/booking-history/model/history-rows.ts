import { isApiError } from "@/shared/api/http";
import type { Booking } from "@/shared/api/schemas";
import type { BookingHistoryEntry } from "@/shared/lib/booking-history";

/** O que a linha precisa de cada `useQuery` de reserva. */
export type HistoryQueryResult = {
  status: "pending" | "error" | "success";
  data: Booking | undefined;
  error: unknown;
  /** Sem rede e sem dados: a consulta ficou em pausa (a linha mostra erro com retry). */
  paused?: boolean;
};

export type HistoryRow =
  | { kind: "found"; entry: BookingHistoryEntry; booking: Booking }
  | { kind: "missing"; entry: BookingHistoryEntry }
  | { kind: "failed"; entry: BookingHistoryEntry }
  | { kind: "unreadable"; entry: BookingHistoryEntry }
  | { kind: "pending"; entry: BookingHistoryEntry };

const classify = (
  entry: BookingHistoryEntry,
  result: HistoryQueryResult | undefined,
): HistoryRow => {
  if (result?.status === "pending" && result.paused) return { kind: "failed", entry };
  if (!result || result.status === "pending") return { kind: "pending", entry };
  if (result.status === "success" && result.data) {
    return { kind: "found", entry, booking: result.data };
  }
  if (isApiError(result.error)) {
    if (result.error.isNotFound()) return { kind: "missing", entry };
    if (result.error.kind === "parse") return { kind: "unreadable", entry };
  }
  return { kind: "failed", entry };
};

/**
 * Uma linha por entrada, **na ordem do storage** (não muda quando os dados chegam). Só o `404` é
 * `missing` (a reserva não existe mais); erro de rede, 5xx e timeout são `failed` e **nunca**
 * apagam o id; corpo fora do schema é `unreadable`.
 */
export const classifyHistoryResults = (
  entries: readonly BookingHistoryEntry[],
  results: readonly (HistoryQueryResult | undefined)[],
): HistoryRow[] => entries.map((entry, index) => classify(entry, results[index]));

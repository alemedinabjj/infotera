import { isApiError } from "@/shared/api/http";
import type { Booking } from "@/shared/api/schemas";

/** Resultado da leitura da reserva. Erros de rede/5xx não entram aqui: são relançados. */
export type BookingLoad =
  | { kind: "found"; booking: Booking }
  | { kind: "not-found" }
  | { kind: "unreadable" };

/** Resultado de um recurso secundário (hotel ou quarto): a reserva nunca depende dele. */
export type Settled<T> = { status: "ok"; data: T } | { status: "missing" } | { status: "error" };

export type LoadErrorClass = "missing" | "unreadable" | "error";

/**
 * Classifica a falha de um `GET`: `404` → `missing`; corpo fora do contrato (`parse`) →
 * `unreadable` (retry não resolve); o resto (5xx, rede, timeout, erro desconhecido) → `error`.
 */
export const classifyLoadError = (error: unknown): LoadErrorClass => {
  if (!isApiError(error)) return "error";
  if (error.isNotFound()) return "missing";
  if (error.kind === "parse") return "unreadable";
  return "error";
};

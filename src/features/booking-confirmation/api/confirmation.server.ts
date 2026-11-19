import "server-only";
import type { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/shared/api/http";
import { hotelQueryOptions, roomQueryOptions } from "@/shared/api/queries";
import type { Booking, Hotel, Room } from "@/shared/api/schemas";
import { getServerQueryClient } from "@/shared/api/server-query-client";
import type { BookingId } from "../model/booking-id";
import { type BookingLoad, classifyLoadError, type Settled } from "../model/load-result";
import { bookingQueryOptions } from "./booking";

export type StayDetails = { hotel: Settled<Hotel>; room: Settled<Room> };

type Resource = "booking" | "hotel" | "room";

/**
 * Só `{ event, resource, kind, status }`: o id da reserva dá acesso à PII e nunca vai para o log,
 * nem nome, e-mail ou mensagem da API.
 */
const logFailure = (resource: Resource, error: unknown): void => {
  console.error({
    event: "confirmation:load",
    resource,
    kind: isApiError(error) ? error.kind : "unknown",
    status: isApiError(error) ? error.status : null,
  });
};

/**
 * Lê a reserva no servidor pelo QueryClient do request (`React.cache`): `generateMetadata` e a
 * página compartilham **um** `GET /bookings/:id`. `404` → `not-found`; corpo fora do contrato →
 * `unreadable`; qualquer outro erro (5xx, rede, timeout) é relançado e cai no `error.tsx`.
 */
export const loadBooking = async (
  id: BookingId,
  queryClient: QueryClient = getServerQueryClient(),
): Promise<BookingLoad> => {
  try {
    return { kind: "found", booking: await queryClient.fetchQuery(bookingQueryOptions(id)) };
  } catch (error) {
    const outcome = classifyLoadError(error);
    switch (outcome) {
      case "missing":
        return { kind: "not-found" };
      case "unreadable":
        logFailure("booking", error);
        return { kind: "unreadable" };
      case "error":
        logFailure("booking", error);
        throw error;
      default: {
        const unreachable: never = outcome;
        return unreachable;
      }
    }
  }
};

/** Nunca rejeita: `404` é `missing`; o resto é `error` (a reserva continua visível). */
const settle = async <T>(resource: Resource, promise: Promise<T>): Promise<Settled<T>> => {
  try {
    return { status: "ok", data: await promise };
  } catch (error) {
    if (classifyLoadError(error) === "missing") return { status: "missing" };
    logFailure(resource, error);
    return { status: "error" };
  }
};

/**
 * Hotel e quarto **começam juntos** (as duas promessas nascem antes de qualquer `await`), e só
 * depois de a reserva chegar, porque os ids estão nela. A promessa devolvida nunca rejeita.
 */
export const loadStayDetails = (
  booking: Booking,
  queryClient: QueryClient = getServerQueryClient(),
): Promise<StayDetails> => {
  const hotel = settle("hotel", queryClient.fetchQuery(hotelQueryOptions(booking.hotelId)));
  const room = settle("room", queryClient.fetchQuery(roomQueryOptions(booking.roomId)));
  return Promise.all([hotel, room]).then(([hotelResult, roomResult]) => ({
    hotel: hotelResult,
    room: roomResult,
  }));
};

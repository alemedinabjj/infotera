import { queryOptions } from "@tanstack/react-query";
import { fetchBooking } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import type { BookingId } from "../model/booking-id";

/** `GET /bookings/:id` com a chave de `shared`. Só o servidor usa (a página nunca lê do cliente). */
export const bookingQueryOptions = (id: BookingId) =>
  queryOptions({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: ({ signal }) => fetchBooking(id, signal),
  });

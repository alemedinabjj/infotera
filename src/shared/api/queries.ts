import { queryOptions } from "@tanstack/react-query";
import {
  fetchBooking,
  fetchHotel,
  fetchHotelRooms,
  fetchHotelsByIds,
  fetchRoom,
} from "./endpoints";
import { queryKeys } from "./query-keys";

export const hotelQueryOptions = (id: number) =>
  queryOptions({
    queryKey: queryKeys.hotels.detail(id),
    queryFn: ({ signal }) => fetchHotel(id, signal),
  });

export const hotelRoomsQueryOptions = (hotelId: number) =>
  queryOptions({
    queryKey: queryKeys.rooms.byHotel(hotelId),
    queryFn: ({ signal }) => fetchHotelRooms(hotelId, signal),
  });

export const roomQueryOptions = (id: number) =>
  queryOptions({
    queryKey: queryKeys.rooms.detail(id),
    queryFn: ({ signal }) => fetchRoom(id, signal),
  });

/** Vários hotéis num request. `enabled` só com ids: lista vazia nunca chama a API. */
export const hotelsByIdsQueryOptions = (ids: readonly number[]) =>
  queryOptions({
    queryKey: queryKeys.hotels.byIds(ids),
    queryFn: ({ signal }) => fetchHotelsByIds(ids, signal),
    enabled: ids.length > 0,
  });

/**
 * `GET /bookings/:id`. `meta.sensitive`: a reserva tem nome, e-mail e telefone; o cache offline
 * persistido (F7b) não deve gravar queries com essa marca.
 */
export const bookingQueryOptions = (id: string | number) =>
  queryOptions({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: ({ signal }) => fetchBooking(id, signal),
    meta: { sensitive: true },
  });

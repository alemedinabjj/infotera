import { queryOptions } from "@tanstack/react-query";
import { fetchHotel, fetchHotelRooms, fetchRoom } from "./endpoints";
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

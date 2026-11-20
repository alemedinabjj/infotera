import { z } from "@/shared/lib/zod";
import { apiGet } from "./http";
import { canonicalIds } from "./ids";
import {
  type Booking,
  bookingSchema,
  type Hotel,
  hotelSchema,
  type Room,
  roomSchema,
} from "./schemas";

const roomsSchema = z.array(roomSchema);
const hotelsSchema = z.array(hotelSchema);

/** `GET /hotels/:id` (404 → `ApiError` com status 404). */
export const fetchHotel = (id: number, signal?: AbortSignal): Promise<Hotel> =>
  apiGet(`/hotels/${id}`, hotelSchema, { signal });

/** `GET /rooms?hotelId=:id`. */
export const fetchHotelRooms = (hotelId: number, signal?: AbortSignal): Promise<Room[]> =>
  apiGet("/rooms", roomsSchema, { query: { hotelId }, signal });

/** `GET /rooms?hotelId=1&hotelId=4&...`: os quartos de vários hotéis num request só (a chave repete). */
export const fetchRoomsOfHotels = (
  hotelIds: readonly number[],
  signal?: AbortSignal,
): Promise<Room[]> =>
  apiGet("/rooms", roomsSchema, { query: { hotelId: hotelIds.map(String) }, signal });

/**
 * `GET /hotels?id=1&id=4`: vários hotéis num request só (a chave repete e funciona como OU; id
 * inexistente simplesmente não volta). **Nunca chama a API com lista vazia**: sem `id` o
 * json-server devolveria todos os hotéis.
 */
export const fetchHotelsByIds = async (
  ids: readonly number[],
  signal?: AbortSignal,
): Promise<Hotel[]> => {
  const unique = canonicalIds(ids);
  if (unique.length === 0) return [];
  return apiGet("/hotels", hotelsSchema, { query: { id: unique.map(String) }, signal });
};

/** `GET /rooms/:id`. */
export const fetchRoom = (id: number, signal?: AbortSignal): Promise<Room> =>
  apiGet(`/rooms/${id}`, roomSchema, { signal });

/**
 * `GET /bookings/:id` (404 → `ApiError` com status 404). O id entra no path com
 * `encodeURIComponent`: nunca vira outro caminho, mesmo que venha de uma URL.
 */
export const fetchBooking = (id: string | number, signal?: AbortSignal): Promise<Booking> =>
  apiGet(`/bookings/${encodeURIComponent(id)}`, bookingSchema, { signal });

import { z } from "zod";
import { apiGet } from "./http";
import {
  type Booking,
  bookingSchema,
  type Hotel,
  hotelSchema,
  type Room,
  roomSchema,
} from "./schemas";

const roomsSchema = z.array(roomSchema);

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

/** `GET /rooms/:id`. */
export const fetchRoom = (id: number, signal?: AbortSignal): Promise<Room> =>
  apiGet(`/rooms/${id}`, roomSchema, { signal });

/**
 * `GET /bookings/:id` (404 → `ApiError` com status 404). O id entra no path com
 * `encodeURIComponent`: nunca vira outro caminho, mesmo que venha de uma URL.
 */
export const fetchBooking = (id: string | number, signal?: AbortSignal): Promise<Booking> =>
  apiGet(`/bookings/${encodeURIComponent(id)}`, bookingSchema, { signal });

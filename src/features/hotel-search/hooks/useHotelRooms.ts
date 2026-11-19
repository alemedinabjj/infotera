"use client";

import { useQuery } from "@tanstack/react-query";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import type { Room } from "@/shared/api/schemas";

/**
 * Quartos do hotel já semeados pela lista (`seedRooms`), só leitura: nunca dispara request
 * (`enabled: false`); sem eles (falha do request) o card usa o preço do hotel.
 */
export const useHotelRooms = (hotelId: number): readonly Room[] | undefined =>
  useQuery({ ...hotelRoomsQueryOptions(hotelId), enabled: false }).data;

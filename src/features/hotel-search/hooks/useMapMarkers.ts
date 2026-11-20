"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import type { Hotel, Room } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import type { SearchCriteria } from "@/shared/lib/search-params";
import type { MapMarker } from "@/shared/ui/map";
import { type CardPricing, deriveCardPricing } from "../model/card-pricing";
import { buildMapMarkers } from "../model/map-markers";
import { useHotelSearchMessages } from "./useHotelSearchMessages";

type MapData = {
  markers: MapMarker[];
  /** Preço por hotel (o mesmo do card), para o popup. */
  pricingById: ReadonlyMap<number, CardPricing>;
};

/**
 * Marcadores dos hotéis exibidos. Os quartos vêm do cache (já semeados pela lista, só leitura: nada
 * é pedido), então o preço do marcador é o mesmo do card.
 */
export const useMapMarkers = (
  hotels: readonly Hotel[],
  criteria: SearchCriteria | null,
): MapData => {
  const locale = useLocale();
  const messages = useHotelSearchMessages().map;
  const rooms = useQueries({
    queries: hotels.map((hotel) => ({ ...hotelRoomsQueryOptions(hotel.id), enabled: false })),
    combine: (results) => results.map((result) => result.data),
  });

  return useMemo(() => {
    const roomsById = new Map<number, readonly Room[]>();
    for (const [index, hotel] of hotels.entries()) {
      const hotelRooms = rooms[index];
      if (hotelRooms) roomsById.set(hotel.id, hotelRooms);
    }
    const pricingById = new Map(
      hotels.map((hotel) => [
        hotel.id,
        deriveCardPricing(hotel, criteria, roomsById.get(hotel.id)),
      ]),
    );
    return {
      markers: buildMapMarkers({ items: hotels, criteria, roomsById, locale, messages }),
      pricingById,
    };
  }, [hotels, criteria, rooms, locale, messages]);
};

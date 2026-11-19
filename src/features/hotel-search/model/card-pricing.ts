import type { Hotel } from "@/shared/api/schemas";
import { nightsBetween } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import {
  type AvailabilityDescription,
  type AvailabilityStatus,
  availabilityStatus,
  describeAvailability,
} from "./availability";
import { stayTotal } from "./stay-price";

export type CardPricing = {
  status: AvailabilityStatus;
  availability: AvailabilityDescription;
  /** Diária do hotel (`pricePerNight`): a que filtro e ordenação usam. */
  nightly: number;
  /** Total da estadia; `null` no `browse` e quando não dá para reservar (esgotado/insuficiente). */
  stay: { total: number; nights: number; rooms: number } | null;
};

/** Tudo que o bloco de preço do card precisa, decidido fora do componente. */
export const deriveCardPricing = (hotel: Hotel, criteria: SearchCriteria | null): CardPricing => {
  const requestedRooms = criteria?.rooms ?? 1;
  const status = availabilityStatus(hotel.availableRooms, requestedRooms);
  const availability = describeAvailability({
    status,
    availableRooms: hotel.availableRooms,
    requestedRooms,
    hasDates: criteria !== null,
  });
  const reservable = status === "available" || status === "scarce";
  if (!criteria || !reservable) {
    return { status, availability, nightly: hotel.pricePerNight, stay: null };
  }
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const total = stayTotal({ pricePerNight: hotel.pricePerNight, nights, rooms: criteria.rooms });
  return {
    status,
    availability,
    nightly: hotel.pricePerNight,
    stay: { total, nights, rooms: criteria.rooms },
  };
};

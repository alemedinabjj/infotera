import type { Hotel, Room } from "@/shared/api/schemas";
import {
  type AvailabilityDescription,
  type AvailabilityStatus,
  availabilityStatus,
  describeAvailability,
} from "@/shared/lib/availability";
import { nightsBetween } from "@/shared/lib/dates";
import { stayTotal } from "@/shared/lib/pricing";
import type { SearchCriteria } from "@/shared/lib/search-params";

export type CardPricing = {
  status: AvailabilityStatus;
  availability: AvailabilityDescription;
  /** "A partir de": o quarto mais barato que serve à busca (sem quartos conhecidos, o `pricePerNight` do hotel). */
  nightly: number;
  /** Total da estadia; `null` no `browse` e quando não dá para reservar (esgotado/insuficiente). */
  stay: { total: number; nights: number; rooms: number } | null;
};

type Party = { rooms: number; guests: number };

/**
 * Quarto mais barato que serve: com `available >= rooms` e `maxGuests * rooms >= guests`. Sem
 * busca (`party` nulo) vale o mais barato com `available > 0`. Empate: o primeiro da lista.
 */
export const cheapestFittingRoom = (rooms: readonly Room[], party: Party | null): Room | null => {
  const wanted = party?.rooms ?? 1;
  const fits = (room: Room): boolean =>
    room.available >= wanted && (party === null || room.maxGuests * wanted >= party.guests);
  return rooms
    .filter(fits)
    .reduce<Room | null>(
      (best, room) => (best === null || room.pricePerNight < best.pricePerNight ? room : best),
      null,
    );
};

/**
 * Tudo que o bloco de preço do card precisa, decidido fora do componente. `rooms` são os quartos do
 * hotel (`undefined` = ainda desconhecidos: vale o `pricePerNight` do hotel). A ordenação por preço
 * segue o `pricePerNight` do hotel (API); o card mostra o quarto que realmente serve à busca.
 */
export const deriveCardPricing = (
  hotel: Hotel,
  criteria: SearchCriteria | null,
  rooms?: readonly Room[],
): CardPricing => {
  const requestedRooms = criteria?.rooms ?? 1;
  const guests = criteria ? criteria.adults + criteria.children : 0;
  const hotelStatus = availabilityStatus(hotel.availableRooms, requestedRooms);
  const room =
    rooms === undefined
      ? null
      : cheapestFittingRoom(rooms, criteria ? { rooms: requestedRooms, guests } : null);
  const reservable = hotelStatus === "available" || hotelStatus === "scarce";
  const status: AvailabilityStatus =
    reservable && rooms !== undefined && room === null && rooms.length > 0 ? "no-fit" : hotelStatus;
  const nightly = room?.pricePerNight ?? hotel.pricePerNight;
  const availability = describeAvailability({
    status,
    availableRooms: hotel.availableRooms,
    requestedRooms,
    hasDates: criteria !== null,
    guests,
  });
  if (!criteria || !(status === "available" || status === "scarce")) {
    return { status, availability, nightly, stay: null };
  }
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const total = stayTotal({ pricePerNight: nightly, nights, rooms: criteria.rooms });
  return { status, availability, nightly, stay: { total, nights, rooms: criteria.rooms } };
};

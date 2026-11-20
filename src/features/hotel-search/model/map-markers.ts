import type { Hotel, Room } from "@/shared/api/schemas";
import type { Locale } from "@/shared/i18n/config";
import { formatBRL } from "@/shared/lib/currency";
import type { SearchCriteria } from "@/shared/lib/search-params";
import type { MapMarker } from "@/shared/ui/map";
import type { HotelSearchMessages } from "../i18n/pt-BR";
import { deriveCardPricing } from "./card-pricing";

type MarkerMessages = Pick<HotelSearchMessages["map"], "soldOut" | "markerLabel" | "soldOutLabel">;

type BuildMarkersInput = {
  /** Os hotéis **exibidos** (página atual ou lotes carregados), na ordem da lista. */
  items: readonly Hotel[];
  criteria: SearchCriteria | null;
  /** Quartos já semeados no cache (iguais aos do card), por id de hotel. */
  roomsById: ReadonlyMap<number, readonly Room[]>;
  locale: Locale;
  messages: MarkerMessages;
};

/** Id do marcador = id do hotel como texto (o mapa não sabe o que é hotel). */
export const markerIdOf = (hotelId: number): string => String(hotelId);

/** Volta do id do marcador para o id do hotel (`null` se não for um id válido). */
export const hotelIdOfMarker = (markerId: string): number | null => {
  const id = Number(markerId);
  return Number.isInteger(id) ? id : null;
};

/**
 * Um marcador de preço por hotel exibido, na ordem da lista (a ordem do Tab). O preço é o mesmo do
 * card (`deriveCardPricing`, quarto mais barato que serve); esgotado mostra "Esgotado" e o estilo
 * apagado. O nome acessível leva o nome e o preço (ou o esgotado).
 */
export const buildMapMarkers = ({
  items,
  criteria,
  roomsById,
  locale,
  messages,
}: BuildMarkersInput): MapMarker[] =>
  items.map((hotel): MapMarker => {
    const pricing = deriveCardPricing(hotel, criteria, roomsById.get(hotel.id));
    const base = {
      id: markerIdOf(hotel.id),
      position: { lat: hotel.latitude, lng: hotel.longitude },
      variant: "pill" as const,
    };
    if (pricing.status === "sold-out") {
      return {
        ...base,
        text: messages.soldOut,
        label: messages.soldOutLabel({ name: hotel.name }),
        tone: "muted",
      };
    }
    const price = formatBRL(pricing.nightly, { cents: false, locale });
    return {
      ...base,
      text: price,
      label: messages.markerLabel({ name: hotel.name, price }),
      tone: "default",
    };
  });

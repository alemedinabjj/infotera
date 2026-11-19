import type { Amenity, PropertyType } from "@/shared/api/schemas";
import type { SortOption } from "./search-filters";

const AMENITY_LABELS: Record<Amenity, string> = {
  wifi: "Wi-Fi",
  breakfast: "Café da manhã",
  pool: "Piscina",
  parking: "Estacionamento",
  beach_access: "Acesso à praia",
  restaurant: "Restaurante",
  bar: "Bar",
  gym: "Academia",
  spa: "Spa",
  room_service: "Serviço de quarto",
  kids_club: "Clube infantil",
  concierge: "Concierge",
  valet: "Manobrista",
  business_center: "Centro de negócios",
  lounge_access: "Acesso ao lounge",
};

/** Ordem de exibição das comodidades no filtro (as mais buscadas primeiro). */
export const AMENITY_DISPLAY_ORDER = [
  "wifi",
  "breakfast",
  "pool",
  "parking",
  "beach_access",
  "restaurant",
  "bar",
  "gym",
  "spa",
  "room_service",
  "kids_club",
  "concierge",
  "valet",
  "business_center",
  "lounge_access",
] as const satisfies readonly Amenity[];

export const amenityLabel = (amenity: Amenity): string => AMENITY_LABELS[amenity];

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  hotel: "Hotel",
  pousada: "Pousada",
  resort: "Resort",
};

/** Ordem de exibição dos tipos de hospedagem. */
export const PROPERTY_TYPE_DISPLAY_ORDER = [
  "hotel",
  "pousada",
  "resort",
] as const satisfies readonly PropertyType[];

export const propertyTypeLabel = (type: PropertyType): string => PROPERTY_TYPE_LABELS[type];

export const sortLabel = (sort: SortOption): string => {
  switch (sort) {
    case "popular":
      return "Mais populares";
    case "price-asc":
      return "Menor preço";
    case "rating-desc":
      return "Maior avaliação";
    default: {
      const unreachable: never = sort;
      return unreachable;
    }
  }
};

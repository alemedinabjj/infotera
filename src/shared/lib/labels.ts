import type { Amenity, PropertyType } from "@/shared/api/schemas";
import { commonMessages } from "../i18n/common/messages";
import type { Locale } from "../i18n/config";

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

export const amenityLabel = (amenity: Amenity, locale: Locale): string =>
  commonMessages.get(locale).amenities[amenity];

/** Ordem de exibição dos tipos de hospedagem. */
export const PROPERTY_TYPE_DISPLAY_ORDER = [
  "hotel",
  "pousada",
  "resort",
] as const satisfies readonly PropertyType[];

export const propertyTypeLabel = (type: PropertyType, locale: Locale): string =>
  commonMessages.get(locale).propertyTypes[type];

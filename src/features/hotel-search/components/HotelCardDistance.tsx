import { MapPinIcon } from "@/shared/ui";
import { distanceKm, formatDistanceFromCenter, type GeoPoint } from "../model/distance";

type HotelCardDistanceProps = {
  hotel: GeoPoint;
  /** Centroide do destino; sem ele (menos de 2 hotéis ou falha) a linha não existe. */
  center: GeoPoint | null;
};

/** Linha `2,3 km do centro` do card (o ícone é decorativo). */
export const HotelCardDistance = ({ hotel, center }: HotelCardDistanceProps) => {
  if (center === null) return null;
  return (
    <p className="flex items-center gap-1 text-sm text-fg-muted">
      <MapPinIcon aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
      {formatDistanceFromCenter(distanceKm(center, hotel))}
    </p>
  );
};

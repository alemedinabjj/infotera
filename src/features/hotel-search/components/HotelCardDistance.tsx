import { MapPinIcon, VisuallyHidden } from "@/shared/ui";
import { distanceKm, formatDistanceFromCenter, type GeoPoint } from "../model/distance";

type HotelCardDistanceProps = {
  hotel: GeoPoint;
  /** Centroide do destino; sem ele (menos de 2 hotéis ou falha) a linha não existe. */
  center: GeoPoint | null;
};

const HELP =
  "Distância em linha reta até o ponto médio dos hotéis cadastrados no destino, não o centro oficial da cidade.";

/**
 * Linha `a 2,3 km do ponto central` do card (o ícone é decorativo). Aparece em qualquer ordenação,
 * então carrega a explicação curta (`title` + "em linha reta" para leitor de tela); o texto de
 * ajuda completo fica sob a toolbar com `sort=distance`.
 */
export const HotelCardDistance = ({ hotel, center }: HotelCardDistanceProps) => {
  if (center === null) return null;
  return (
    <p title={HELP} className="flex items-center gap-1 text-sm text-fg-muted">
      <MapPinIcon aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
      {formatDistanceFromCenter(distanceKm(center, hotel))}
      <VisuallyHidden>, em linha reta</VisuallyHidden>
    </p>
  );
};

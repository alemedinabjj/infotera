import type { Hotel } from "@/shared/api/schemas";
import { osmLink } from "@/shared/lib/geo";
import { OSM_COPYRIGHT_URL, tileUrl } from "@/shared/lib/map-tiles";
import { MapPinIcon } from "@/shared/ui";
import { staticMapLayout } from "../model/static-map";
import { MapTile } from "./MapTile";
import { Section } from "./Section";

const ZOOM = 15;

type StaticMapProps = { hotel: Hotel };

/**
 * Mapa estático (RSC, sem JS): tiles do OpenStreetMap posicionados em % por `staticMapLayout` e o
 * marcador no ponto. Isolado para trocar por Leaflet/provedor depois. A atribuição fica fora do
 * `role="img"` (filhos de `img` são apresentacionais e o link sumiria).
 */
const StaticMap = ({ hotel }: StaticMapProps) => {
  const map = staticMapLayout({
    lat: hotel.latitude,
    lon: hotel.longitude,
    zoom: ZOOM,
    width: 640,
    height: 320,
  });
  return (
    <div className="relative aspect-[2/1] overflow-hidden rounded-card border border-border bg-surface-sunken">
      <div role="img" aria-label={`Mapa: ${hotel.address}`} className="absolute inset-0">
        {map.tiles.map((tile) => (
          <MapTile
            key={`${tile.x}/${tile.y}`}
            src={tileUrl(tile)}
            style={{
              left: `${tile.leftPct}%`,
              top: `${tile.topPct}%`,
              width: `${tile.sizePct.w}%`,
              height: `${tile.sizePct.h}%`,
            }}
          />
        ))}
        <MapPinIcon
          aria-hidden="true"
          className="absolute size-8 -translate-x-1/2 -translate-y-full text-primary"
          style={{ left: `${map.marker.leftPct}%`, top: `${map.marker.topPct}%` }}
        />
      </div>
      <p className="absolute right-0 bottom-0 bg-surface/90 px-2 py-0.5 text-xs">
        <a
          href={OSM_COPYRIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline after:absolute after:inset-x-0 after:bottom-0 after:h-11 after:content-['']"
        >
          © colaboradores do OpenStreetMap
        </a>
      </p>
    </div>
  );
};

/** Seção "Localização": endereço, mapa estático e link para o OpenStreetMap. */
export const LocationMap = ({ hotel }: { hotel: Hotel }) => (
  <Section id="localizacao" title="Localização">
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[2fr_1fr] lg:gap-6">
      <StaticMap hotel={hotel} />
      <div className="flex flex-col items-start gap-1">
        <p className="flex items-start gap-1 text-sm text-fg">
          <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-muted" />
          {hotel.address}
        </p>
        <a
          href={osmLink(hotel.latitude, hotel.longitude, ZOOM)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
        >
          Abrir no OpenStreetMap
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
    </div>
  </Section>
);

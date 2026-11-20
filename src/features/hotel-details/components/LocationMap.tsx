import type { Hotel } from "@/shared/api/schemas";
import { commonMessages } from "@/shared/i18n/common/messages";
import { contentLang, type Locale } from "@/shared/i18n/config";
import { osmLink } from "@/shared/lib/geo";
import { OSM_COPYRIGHT_URL, tileUrl } from "@/shared/lib/map-tiles";
import { MapPinIcon } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";
import { staticMapLayout } from "../model/static-map";
import { InteractiveLocationMap } from "./InteractiveLocationMap";
import { MapTile } from "./MapTile";
import { Section } from "./Section";

const ZOOM = 15;

type StaticMapProps = { hotel: Hotel; locale: Locale };

/**
 * Mapa estático (RSC, sem JS): tiles do OpenStreetMap posicionados em % por `staticMapLayout` e o
 * marcador no ponto. É a base da moldura de `InteractiveLocationMap` (o Leaflet entra por cima).
 * A atribuição fica fora do `role="img"` (filhos de `img` são apresentacionais e o link sumiria).
 */
const StaticMap = ({ hotel, locale }: StaticMapProps) => {
  const t = hotelDetailsMessages.get(locale).location;
  const map = staticMapLayout({
    lat: hotel.latitude,
    lon: hotel.longitude,
    zoom: ZOOM,
    width: 640,
    height: 320,
  });
  return (
    <>
      <div
        role="img"
        aria-label={t.mapRegion({ address: hotel.address })}
        className="absolute inset-0"
      >
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
          {commonMessages.get(locale).map.attribution}
        </a>
      </p>
    </>
  );
};

/** Seção "Localização": endereço, mapa estático e link para o OpenStreetMap. */
export const LocationMap = ({ hotel, locale }: { hotel: Hotel; locale: Locale }) => {
  const t = hotelDetailsMessages.get(locale);
  return (
    <Section id="localizacao" title={t.sections.location}>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[2fr_1fr] lg:gap-6">
        <InteractiveLocationMap hotel={hotel} zoom={ZOOM}>
          <StaticMap hotel={hotel} locale={locale} />
        </InteractiveLocationMap>
        <div className="flex flex-col items-start gap-1">
          <p className="flex items-start gap-1 text-sm text-fg">
            <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-muted" />
            <span lang={contentLang(locale)}>{hotel.address}</span>
          </p>
          <a
            href={osmLink(hotel.latitude, hotel.longitude, ZOOM)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
          >
            {t.location.openOsm}
            <span className="sr-only"> {t.location.newTab}</span>
          </a>
        </div>
      </div>
    </Section>
  );
};

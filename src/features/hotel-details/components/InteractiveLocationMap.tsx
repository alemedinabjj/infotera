"use client";

import { type ReactNode, useRef, useState } from "react";
import type { Hotel } from "@/shared/api/schemas";
import { useOnline } from "@/shared/hooks/useOnline";
import { useLocale } from "@/shared/i18n/client";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { contentLang } from "@/shared/i18n/config";
import { type MapMarker, useInteractiveMap } from "@/shared/ui/map";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { useNearViewport } from "../hooks/useNearViewport";

type InteractiveLocationMapProps = {
  hotel: Pick<Hotel, "id" | "name" | "address" | "latitude" | "longitude">;
  zoom: number;
  /** Mapa estático (RSC): a base sem JS, que fica até o Leaflet carregar os primeiros tiles. */
  children: ReactNode;
};

const FRAME =
  "relative aspect-[2/1] overflow-hidden rounded-card border border-border bg-surface-sunken";

/**
 * Moldura do mapa da página do hotel. Sem JS, offline ou com erro, é o mapa estático da F4. Quando a
 * moldura chega perto da viewport **e** há rede, o Leaflet carrega por cima, no mesmo centro e zoom;
 * o estático só sai depois do primeiro lote de tiles (troca sem salto: a altura é a da moldura).
 * Falha do chunk ou dos tiles: o estático continua, sem mensagem de erro (o conteúdo está lá).
 */
export const InteractiveLocationMap = ({ hotel, zoom, children }: InteractiveLocationMapProps) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const near = useNearViewport(frameRef);
  const online = useOnline();
  const [tiles, setTiles] = useState<"pending" | "loaded" | "failed">("pending");
  const load = useInteractiveMap(near && online && tiles !== "failed");
  const locale = useLocale();
  const common = useCommonMessages().map;
  const messages = useHotelDetailsMessages().location;

  const markers: MapMarker[] = [
    {
      id: String(hotel.id),
      position: { lat: hotel.latitude, lng: hotel.longitude },
      variant: "pin",
      text: "",
      label: hotel.name,
      tone: "default",
    },
  ];

  return (
    <div ref={frameRef} className={FRAME}>
      {tiles === "loaded" ? null : children}
      {load.status === "ready" ? (
        <load.Map
          className={tiles === "loaded" ? "absolute inset-0" : "invisible absolute inset-0"}
          center={{ lat: hotel.latitude, lng: hotel.longitude }}
          zoom={zoom}
          markers={markers}
          onTilesLoad={() => setTiles("loaded")}
          onTilesError={() => setTiles("failed")}
          renderPopup={() => (
            <div className="flex flex-col gap-0.5 text-sm">
              <p className="font-semibold text-fg">{hotel.name}</p>
              <p lang={contentLang(locale)} className="text-fg-muted">
                {hotel.address}
              </p>
            </div>
          )}
          labels={{
            region: messages.mapRegion({ address: hotel.address }),
            hint: common.keyboardHint,
            zoomIn: common.zoomIn,
            zoomOut: common.zoomOut,
            closePopup: common.closePopup,
            attribution: common.attribution,
          }}
        />
      ) : null}
    </div>
  );
};

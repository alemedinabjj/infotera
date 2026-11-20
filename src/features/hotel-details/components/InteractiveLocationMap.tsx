"use client";

import { type ReactNode, useCallback, useId, useRef, useState } from "react";
import type { Hotel } from "@/shared/api/schemas";
import { useOnline } from "@/shared/hooks/useOnline";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { MapHint, type MapMarker, type PopupApi, useInteractiveMap } from "@/shared/ui/map";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { useNearViewport } from "../hooks/useNearViewport";

type InteractiveLocationMapProps = {
  hotel: Pick<Hotel, "id" | "name" | "address" | "latitude" | "longitude">;
  zoom: number;
  /** Mapa estático (RSC): a base sem JS, que fica até o Leaflet carregar os primeiros tiles. */
  children: ReactNode;
};

const FRAME =
  "relative aspect-[4/3] overflow-hidden rounded-card border border-border bg-surface-sunken sm:aspect-[2/1]";

/**
 * Moldura do mapa da página do hotel (4:3 abaixo de `sm`, 2:1 a partir de `sm`, igual ao estático).
 * Sem JS, offline ou com erro, é o mapa estático da F4. Quando a moldura chega perto da viewport
 * **e** há rede, o Leaflet carrega por cima, no mesmo centro e zoom; o estático só sai depois do
 * primeiro lote de tiles (troca sem salto: a altura é a da moldura). Falha do chunk ou dos tiles: o
 * estático continua, sem mensagem de erro (o conteúdo está lá). A dica de teclado fica abaixo da
 * moldura. O popup mostra só o nome (o endereço já está na página, ao lado).
 */
export const InteractiveLocationMap = ({ hotel, zoom, children }: InteractiveLocationMapProps) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const near = useNearViewport(frameRef);
  const online = useOnline();
  const [tiles, setTiles] = useState<"pending" | "loaded" | "failed">("pending");
  const load = useInteractiveMap(near && online && tiles !== "failed");
  const hintId = useId();
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
  const renderPopup = useCallback(
    (_id: string, { titleId }: PopupApi) => (
      <div className="p-3">
        <h3 id={titleId} className="line-clamp-2 pr-11 text-sm font-semibold text-fg">
          {hotel.name}
        </h3>
      </div>
    ),
    [hotel.name],
  );

  return (
    <div className="group/map relative isolate">
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
            renderPopup={renderPopup}
            hintId={hintId}
            labels={{
              region: messages.mapRegion({ address: hotel.address }),
              zoomIn: common.zoomIn,
              zoomOut: common.zoomOut,
              closePopup: common.closePopup,
              attribution: common.attribution,
            }}
          />
        ) : null}
      </div>
      <MapHint id={hintId} text={common.keyboardHint} active={tiles === "loaded"} />
    </div>
  );
};

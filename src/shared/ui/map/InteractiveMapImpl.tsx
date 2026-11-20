"use client";

import "leaflet/dist/leaflet.css";
import "./map.css";
import { useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AttributionControl, MapContainer, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { cn } from "../../lib/cn";
import { FIT_MAX_ZOOM, FIT_PADDING, fitPlan, type LatLng } from "../../lib/geo";
import { MAX_ZOOM, TILE_URL } from "../../lib/map-tiles";
import { attributionHtml } from "./attribution";
import { MarkerItem } from "./MapMarkerItem";
import type { MapLabels, MapMarker, PopupApi } from "./types";

const DEFAULT_CENTER: LatLng = { lat: -14.235, lng: -51.9253 };
const DEFAULT_ZOOM = 4;

export type InteractiveMapProps = {
  /** Com `center`, o mapa é fixo ali (hotel); sem ele, enquadra os marcadores quando o conjunto muda. */
  center?: LatLng;
  zoom?: number;
  markers: readonly MapMarker[];
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  /**
   * Conteúdo do popup do marcador (sem ele o marcador não abre popup). Receba `popup.titleId` no título
   * (nomeia o diálogo) e `popup.close` para fechar. O botão × é do mapa. Passe uma função estável
   * (`useCallback`): o `memo` dos marcadores depende dela.
   */
  renderPopup?: (id: string, popup: PopupApi) => ReactNode;
  /** Primeiro lote de tiles carregado (a ilha do hotel troca o mapa estático nesse momento). */
  onTilesLoad?: () => void;
  /** O lote terminou e **nenhum** tile veio (sem rede, bloqueio): quem chamou mantém o plano B. */
  onTilesError?: () => void;
  labels: MapLabels;
  /** Id da dica de teclado (`MapHint`, fora da moldura): vira o `aria-describedby` do contêiner. */
  hintId: string;
  className?: string;
};

type ReducedProps = { reduced: boolean };

/**
 * Enquadra os marcadores uma vez por montagem. O pai usa `key` = ids dos marcadores, então só um
 * conjunto novo de ids reenquadra (destaque e hover nunca).
 */
const FitToMarkers = ({ markers, reduced }: { markers: readonly MapMarker[] } & ReducedProps) => {
  const map = useMap();
  const [initial] = useState(markers);
  useEffect(() => {
    const plan = fitPlan(initial.map((marker) => marker.position));
    if (plan.kind === "center") {
      map.setView(plan.center, plan.zoom, { animate: !reduced });
    } else if (plan.kind === "fit") {
      const { south, west, north, east } = plan.bounds;
      map.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { padding: [FIT_PADDING, FIT_PADDING], maxZoom: FIT_MAX_ZOOM, animate: !reduced },
      );
    }
  }, [map, initial, reduced]);
  return null;
};

/** Nome e descrição no contêiner focável do Leaflet (o leitor de tela anuncia ao focar) e `data-zoom`. */
const MapAccessibility = ({ region, hintId }: { region: string; hintId: string }) => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", region);
    container.setAttribute("aria-describedby", hintId);
  }, [map, region, hintId]);
  // `data-zoom` expõe o nível atual (os testes E2E leem; tiles em cache não geram novo request).
  useEffect(() => {
    const container = map.getContainer();
    const publish = () => container.setAttribute("data-zoom", String(map.getZoom()));
    publish();
    map.on("zoomend", publish);
    return () => {
      map.off("zoomend", publish);
    };
  }, [map]);
  return null;
};

/**
 * Mapa interativo genérico (Leaflet + tiles OSM). Não sabe o que é hotel: recebe marcadores com
 * texto pronto. Contêiner `relative z-0` dentro do wrapper `isolate` de quem usa (o Leaflet usa
 * z-index até 1000 e nada dele pode passar sobre o header); nenhum `z-*` nosso aqui dentro: a
 * atribuição é o controle nativo. Roda do mouse rola a página (zoom por botões, `+`/`-`, duplo
 * clique e pinça), animações desligadas com `prefers-reduced-motion`, marcador focável com Enter ou
 * Espaço abrindo o popup.
 */
export const InteractiveMapImpl = ({
  center,
  zoom = DEFAULT_ZOOM,
  markers,
  activeId = null,
  onActiveChange,
  onSelect,
  renderPopup,
  onTilesLoad,
  onTilesError,
  labels,
  hintId,
  className,
}: InteractiveMapProps) => {
  const reduced = useReducedMotion() ?? false;
  const tileCounts = useRef({ ok: 0, failed: 0 });
  // `load` do Leaflet vale também quando todos os tiles falharam: só conta como carregado se algum veio.
  const onLoad = () => {
    if (tileCounts.current.ok > 0) onTilesLoad?.();
    else if (tileCounts.current.failed > 0) onTilesError?.();
  };
  const idsKey = markers.map((marker) => marker.id).join("|");
  return (
    <div className={cn("relative z-0", className)}>
      <MapContainer
        center={center ?? DEFAULT_CENTER}
        zoom={zoom}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        zoomSnap={0.5}
        zoomAnimation={!reduced}
        fadeAnimation={!reduced}
        markerZoomAnimation={!reduced}
        className="size-full"
      >
        <TileLayer
          url={TILE_URL}
          maxZoom={MAX_ZOOM}
          attribution={attributionHtml(labels.attribution)}
          crossOrigin="anonymous"
          eventHandlers={{
            tileload: () => {
              tileCounts.current.ok += 1;
            },
            tileerror: () => {
              tileCounts.current.failed += 1;
            },
            load: onLoad,
          }}
        />
        <ZoomControl zoomInTitle={labels.zoomIn} zoomOutTitle={labels.zoomOut} />
        <AttributionControl prefix={false} />
        <MapAccessibility region={labels.region} hintId={hintId} />
        {center ? null : <FitToMarkers key={idsKey} markers={markers} reduced={reduced} />}
        {markers.map((marker) => (
          <MarkerItem
            key={marker.id}
            marker={marker}
            active={activeId === marker.id}
            closeLabel={labels.closePopup}
            onActiveChange={onActiveChange}
            onSelect={onSelect}
            renderPopup={renderPopup}
          />
        ))}
      </MapContainer>
    </div>
  );
};

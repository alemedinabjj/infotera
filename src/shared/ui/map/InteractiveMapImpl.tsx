"use client";

import "leaflet/dist/leaflet.css";
import "./map.css";
import type { Marker as LeafletMarker, PopupEvent } from "leaflet";
import { useReducedMotion } from "motion/react";
import { memo, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { cn } from "../../lib/cn";
import { FIT_MAX_ZOOM, FIT_PADDING, fitPlan, type LatLng } from "../../lib/geo";
import { MAX_ZOOM, OSM_COPYRIGHT_URL, TILE_URL } from "../../lib/map-tiles";
import { createMarkerIcon, decorateMarkerElement } from "./MapMarkerElement";
import type { MapLabels, MapMarker } from "./types";

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
  /** Conteúdo do popup do marcador (sem ele o marcador não abre popup); `close` fecha o popup. */
  renderPopup?: (id: string, close: () => void) => ReactNode;
  /** Primeiro lote de tiles carregado (a ilha do hotel troca o mapa estático nesse momento). */
  onTilesLoad?: () => void;
  /** O lote terminou e **nenhum** tile veio (sem rede, bloqueio): quem chamou mantém o plano B. */
  onTilesError?: () => void;
  labels: MapLabels;
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
const MapAccessibility = ({ labels, hintId }: { labels: MapLabels; hintId: string }) => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", labels.region);
    container.setAttribute("aria-describedby", hintId);
  }, [map, labels.region, hintId]);
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

type MarkerItemProps = {
  marker: MapMarker;
  active: boolean;
  closeLabel: string;
  onActiveChange: ((id: string | null) => void) | undefined;
  onSelect: ((id: string) => void) | undefined;
  renderPopup: ((id: string, close: () => void) => ReactNode) | undefined;
};

const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Conteúdo do popup. O Leaflet só monta o conteúdo (portal do React) depois de abrir; aberto por
 * teclado, o foco vai para o primeiro controle (senão o próximo Tab iria para o marcador seguinte).
 */
const PopupBody = ({ focusOnMount, children }: { focusOnMount: boolean; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnMount)
      ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
  }, [focusOnMount]);
  return <div ref={ref}>{children}</div>;
};

/** Um marcador. `active` vem por seletor, então passar o mouse re-renderiza só dois itens. */
const MarkerItem = memo(function MarkerItem({
  marker,
  active,
  closeLabel,
  onActiveChange,
  onSelect,
  renderPopup,
}: MarkerItemProps) {
  const { id, label, variant, text, tone, position } = marker;
  const ref = useRef<LeafletMarker | null>(null);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  // O ícone depende só do que é desenhado; o destaque é CSS (`data-active`).
  const icon = useMemo(() => createMarkerIcon({ variant, text, tone }), [variant, text, tone]);

  useEffect(() => {
    const element = ref.current?.getElement();
    decorateMarkerElement(element, { id, label }, active);
    if (!element) return;
    const enter = () => onActiveChange?.(id);
    const leave = () => onActiveChange?.(null);
    // O Leaflet abre o popup no `keypress` Enter sem avisar quem abriu: o `keydown` marca a origem.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") ref.current?.closePopup();
      if (event.key !== "Enter") return;
      setOpenedByKeyboard(true);
      onSelect?.(id);
    };
    element.addEventListener("focus", enter);
    element.addEventListener("blur", leave);
    element.addEventListener("keydown", onKeyDown);
    return () => {
      element.removeEventListener("focus", enter);
      element.removeEventListener("blur", leave);
      element.removeEventListener("keydown", onKeyDown);
    };
  }, [id, label, active, onActiveChange, onSelect]);

  const onPopupOpen = (event: PopupEvent) => {
    const popup = event.popup.getElement();
    popup?.querySelector(".leaflet-popup-close-button")?.setAttribute("aria-label", closeLabel);
    // O teclado do mapa só escuta com o contêiner focado; com o foco no popup o Esc é nosso.
    popup?.addEventListener("keydown", (keyEvent) => {
      if (keyEvent.key === "Escape") event.popup.close();
    });
  };

  /** Esc ou × devolvem o foco ao marcador (o Leaflet 1.9 não devolve); clique fora não rouba foco. */
  const onPopupClose = (event: PopupEvent) => {
    const focused = document.activeElement;
    const insidePopup = Boolean(event.popup.getElement()?.contains(focused));
    if (insidePopup || focused === document.body) ref.current?.getElement()?.focus();
  };

  return (
    <Marker
      ref={ref}
      position={position}
      icon={icon}
      keyboard
      zIndexOffset={active ? 1000 : 0}
      eventHandlers={{
        click: () => {
          setOpenedByKeyboard(false);
          onSelect?.(id);
        },
        mouseover: () => onActiveChange?.(id),
        mouseout: () => onActiveChange?.(null),
        popupopen: onPopupOpen,
        popupclose: onPopupClose,
      }}
    >
      {renderPopup ? (
        <Popup>
          <PopupBody focusOnMount={openedByKeyboard}>
            {renderPopup(id, () => ref.current?.closePopup())}
          </PopupBody>
        </Popup>
      ) : null}
    </Marker>
  );
});

const Attribution = ({ text }: { text: string }) => (
  <p className="absolute right-0 bottom-0 z-[1000] bg-surface/90 px-2 py-0.5 text-xs">
    <a
      href={OSM_COPYRIGHT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline"
    >
      {text}
    </a>
  </p>
);

/**
 * Mapa interativo genérico (Leaflet + tiles OSM). Não sabe o que é hotel: recebe marcadores com
 * texto pronto. Contêiner `isolate relative z-0` (o Leaflet usa z-index até 1000), roda do mouse
 * rola a página (zoom por botões, `+`/`-`, duplo clique e pinça), animações desligadas com
 * `prefers-reduced-motion`, marcador focável com Enter abrindo o popup.
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
  className,
}: InteractiveMapProps) => {
  const reduced = useReducedMotion() ?? false;
  const hintId = useId();
  const tileCounts = useRef({ ok: 0, failed: 0 });
  // `load` do Leaflet vale também quando todos os tiles falharam: só conta como carregado se algum veio.
  const onLoad = () => {
    if (tileCounts.current.ok > 0) onTilesLoad?.();
    else if (tileCounts.current.failed > 0) onTilesError?.();
  };
  const idsKey = markers.map((marker) => marker.id).join("|");
  return (
    <div className={cn("group/map relative isolate z-0", className)}>
      <MapContainer
        center={center ?? DEFAULT_CENTER}
        zoom={zoom}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        zoomAnimation={!reduced}
        fadeAnimation={!reduced}
        markerZoomAnimation={!reduced}
        className="size-full"
      >
        <TileLayer
          url={TILE_URL}
          maxZoom={MAX_ZOOM}
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
        <MapAccessibility labels={labels} hintId={hintId} />
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
      <p
        id={hintId}
        className="pointer-events-none absolute inset-x-2 top-2 z-[1000] rounded-control bg-surface/95 px-2 py-1 text-center text-xs text-fg-muted opacity-0 shadow-card group-focus-within/map:opacity-100"
      >
        {labels.hint}
      </p>
      <Attribution text={labels.attribution} />
    </div>
  );
};

"use client";

import { useCallback, useId, useRef } from "react";
import type { Hotel } from "@/shared/api/schemas";
import { useOnline } from "@/shared/hooks/useOnline";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Skeleton } from "@/shared/ui";
import {
  type InteractiveMapLoad,
  MapHint,
  type MapLabels,
  type PopupApi,
  useInteractiveMap,
} from "@/shared/ui/map";
import { useFocusMapAfterRetry } from "../hooks/useFocusMapAfterRetry";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import { useMapMarkers } from "../hooks/useMapMarkers";
import { hotelIdOfMarker } from "../model/map-markers";
import { useIsActiveHotelId, useMapSync } from "../store/map-sync";
import { MapLoadAlert, MapOfflineAlert } from "./MapPanelAlerts";
import { MapPopup } from "./MapPopup";
import { SkipMapLink } from "./SkipMapLink";

type ResultsMapProps = {
  /** Id do painel (`aria-controls` do botão). */
  id: string;
  hotels: readonly Hotel[];
  criteria: SearchCriteria | null;
};

const FRAME =
  "relative h-[clamp(280px,45dvh,420px)] overflow-hidden rounded-card border border-border bg-surface-sunken";

type ReadyMapProps = ResultsMapProps & {
  MapView: Extract<InteractiveMapLoad, { status: "ready" }>["Map"];
  hintId: string;
};

const ReadyMap = ({ MapView, hotels, criteria, hintId }: ReadyMapProps) => {
  const messages = useHotelSearchMessages().map;
  const common = useCommonMessages().map;
  const { markers, pricingById } = useMapMarkers(hotels, criteria);
  const activeId = useIsActiveHotelId();
  const setActive = useMapSync((state) => state.setActive);
  const revealCard = useMapSync((state) => state.revealCard);

  const onActiveChange = useCallback(
    (markerId: string | null) => setActive(markerId === null ? null : hotelIdOfMarker(markerId)),
    [setActive],
  );

  const renderPopup = useCallback(
    (markerId: string, { close, titleId }: PopupApi) => {
      const hotelId = hotelIdOfMarker(markerId);
      const hotel = hotels.find((item) => item.id === hotelId);
      const pricing = hotelId === null ? undefined : pricingById.get(hotelId);
      if (!hotel || !pricing) return null;
      return (
        <MapPopup
          hotel={hotel}
          pricing={pricing}
          criteria={criteria}
          titleId={titleId}
          onShowInList={() => {
            close();
            revealCard?.(hotel.id);
          }}
        />
      );
    },
    [hotels, pricingById, criteria, revealCard],
  );

  const labels: MapLabels = {
    region: messages.region,
    zoomIn: common.zoomIn,
    zoomOut: common.zoomOut,
    closePopup: common.closePopup,
    attribution: common.attribution,
  };

  return (
    <MapView
      className="size-full"
      markers={markers}
      activeId={activeId === null ? null : String(activeId)}
      onActiveChange={onActiveChange}
      labels={labels}
      hintId={hintId}
      renderPopup={renderPopup}
    />
  );
};

const LoadingFrame = ({ label }: { label: string }) => (
  <div role="status" aria-live="polite" className="size-full">
    <Skeleton shape="block" className="size-full rounded-none" />
    <p className="sr-only">{label}</p>
    <p
      aria-hidden="true"
      className="absolute inset-0 grid place-items-center text-sm text-fg-muted"
    >
      {label}
    </p>
  </div>
);

/**
 * Painel do mapa acima da lista (só na visão `results`): um marcador de preço por hotel exibido,
 * sincronizado com os cards. É complemento: a lista abaixo é a alternativa completa. Sem internet ou
 * com o chunk falhando, o painel encolhe para um alerta (a lista continua); carregando mostra
 * skeleton. A dica de teclado fica abaixo da moldura, em fluxo.
 */
export const ResultsMap = (props: ResultsMapProps) => {
  const messages = useHotelSearchMessages().map;
  const online = useOnline();
  const load = useInteractiveMap(online);
  const hintId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusMapAfterRetry(panelRef, load.status);

  const alert =
    !online && load.status !== "ready" ? (
      <MapOfflineAlert />
    ) : load.status === "error" ? (
      <MapLoadAlert retrying={load.retrying} onRetry={load.retry} />
    ) : null;

  return (
    <div
      id={props.id}
      ref={panelRef}
      aria-busy={load.status === "loading"}
      className="group/map relative isolate"
    >
      {load.status === "ready" ? (
        <SkipMapLink panelId={props.id} firstHotelId={props.hotels[0]?.id} />
      ) : null}
      {alert ?? (
        <>
          <div className={FRAME}>
            {load.status === "ready" ? (
              <ReadyMap {...props} MapView={load.Map} hintId={hintId} />
            ) : (
              <LoadingFrame label={messages.loading} />
            )}
          </div>
          <MapHint id={hintId} text={messages.keyboardHint} active={load.status === "ready"} />
        </>
      )}
    </div>
  );
};

"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Hotel } from "@/shared/api/schemas";
import { useOnline } from "@/shared/hooks/useOnline";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Alert, Button, Skeleton, SkipLink, WifiOffIcon } from "@/shared/ui";
import { type InteractiveMapLoad, type MapLabels, useInteractiveMap } from "@/shared/ui/map";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import { useMapMarkers } from "../hooks/useMapMarkers";
import { hotelIdOfMarker } from "../model/map-markers";
import { useIsActiveHotelId, useMapSync } from "../store/map-sync";
import { MapPopup } from "./MapPopup";

type ResultsMapProps = {
  /** Id do painel (`aria-controls` do botão). */
  id: string;
  hotels: readonly Hotel[];
  criteria: SearchCriteria | null;
};

const PANEL =
  "relative isolate h-[clamp(280px,45dvh,420px)] overflow-hidden rounded-card border border-border bg-surface-sunken";

type PanelBodyProps = ResultsMapProps & { load: InteractiveMapLoad; online: boolean };

const PanelBody = ({ hotels, criteria, load, online }: PanelBodyProps) => {
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

  const labels: MapLabels = {
    region: messages.region,
    hint: messages.keyboardHint,
    zoomIn: common.zoomIn,
    zoomOut: common.zoomOut,
    closePopup: common.closePopup,
    attribution: common.attribution,
  };

  if (!online && load.status !== "ready") {
    return (
      <Alert
        tone="warning"
        icon={<WifiOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
        className="m-3"
      >
        {messages.offline}
      </Alert>
    );
  }
  if (load.status === "error") {
    return (
      <Alert
        tone="danger"
        className="m-3"
        action={
          <Button variant="secondary" size="sm" onClick={load.retry}>
            {messages.retry}
          </Button>
        }
      >
        {messages.loadError}
      </Alert>
    );
  }
  if (load.status !== "ready") {
    return (
      <div role="status" aria-live="polite" className="size-full">
        <Skeleton shape="block" className="size-full rounded-none" />
        <p className="sr-only">{messages.loading}</p>
        <p
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center text-sm text-fg-muted"
        >
          {messages.loading}
        </p>
      </div>
    );
  }
  return (
    <load.Map
      className="size-full"
      markers={markers}
      activeId={activeId === null ? null : String(activeId)}
      onActiveChange={onActiveChange}
      labels={labels}
      renderPopup={(markerId, close) => {
        const hotelId = hotelIdOfMarker(markerId);
        const hotel = hotels.find((item) => item.id === hotelId);
        const pricing = hotelId === null ? undefined : pricingById.get(hotelId);
        if (!hotel || !pricing) return null;
        return (
          <MapPopup
            hotel={hotel}
            pricing={pricing}
            criteria={criteria}
            onShowInList={() => {
              revealCard?.(hotel.id);
              close();
            }}
          />
        );
      }}
    />
  );
};

/**
 * Painel do mapa acima da lista (só na visão `results`): um marcador de preço por hotel exibido,
 * sincronizado com os cards. É complemento: a lista abaixo é a alternativa completa. Offline mostra
 * um aviso (a lista continua), carregando mostra skeleton e falha do chunk mostra retry.
 */
export const ResultsMap = (props: ResultsMapProps) => {
  const messages = useHotelSearchMessages().map;
  const online = useOnline();
  const load = useInteractiveMap(online);
  const revealCard = useMapSync((state) => state.revealCard);
  const firstId = props.hotels[0]?.id;
  const panelRef = useRef<HTMLDivElement>(null);

  // Depois de "Tentar de novo" o botão some com o alerta: quando o mapa chega, o foco vai para ele (nunca para o `body`).
  const failed = useRef(false);
  useEffect(() => {
    if (load.status === "error") failed.current = true;
    if (load.status !== "ready" || !failed.current) return;
    failed.current = false;
    panelRef.current
      ?.querySelector<HTMLElement>(".leaflet-container")
      ?.focus({ preventScroll: true });
  }, [load.status]);

  return (
    <div className="flex flex-col gap-2">
      <SkipLink
        targetId={props.id}
        label={messages.skip}
        onClick={(event) => {
          // Pula o mapa: o foco vai para o início da lista (o primeiro card), não para o topo da página.
          event.preventDefault();
          if (firstId !== undefined) revealCard?.(firstId);
        }}
      />
      <div id={props.id} ref={panelRef} className={PANEL}>
        <PanelBody {...props} load={load} online={online} />
      </div>
    </div>
  );
};

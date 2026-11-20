"use client";

import type { Amenity, Hotel } from "@/shared/api/schemas";
import { getTotalPages } from "@/shared/lib/pagination";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Alert, Pagination, WifiOffIcon } from "@/shared/ui";
import type { FeedState } from "../hooks/results-model";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import { usePagesReveal } from "../hooks/usePagesReveal";
import type { GeoPoint } from "../model/distance";
import type { ResultsView } from "../model/results-view";
import { PAGE_SIZE } from "../model/search-filters";
import { HotelFeed } from "./HotelFeed";
import { ResultsEmpty } from "./ResultsEmpty";
import { ResultsError } from "./ResultsError";
import { ResultsList } from "./ResultsList";
import { ResultsMap } from "./ResultsMap";
import { ResultsSkeleton } from "./ResultsSkeleton";
import { RevealOnMount } from "./RevealOnMount";

type ResultsSectionProps = {
  view: ResultsView;
  hotels: readonly Hotel[];
  center: GeoPoint | null;
  total: number;
  page: number;
  destination: string;
  criteria: SearchCriteria | null;
  selectedAmenities: readonly Amenity[];
  pageHref: (page: number) => string;
  onRetry: () => void;
  retrying: boolean;
  onClearFilters: () => void;
  /** Id do h2 da contagem (rótulo do feed). */
  headingId: string;
  /** Presente na rolagem contínua (no lugar da lista paginada). */
  feed: FeedState | null;
  /** Painel do mapa aberto (`map=1`); só aparece na visão `results`. */
  mapOpen: boolean;
  mapPanelId: string;
};

const OfflineIcon = () => <WifiOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />;

type ResultsContentProps = ResultsSectionProps & {
  view: Extract<ResultsView, { kind: "results" }>;
};

/** Visão `results`: aviso offline, painel do mapa (se aberto) e a lista (páginas) ou o feed. */
const ResultsContent = (props: ResultsContentProps) => {
  const t = useHotelSearchMessages().list;
  const { view } = props;
  usePagesReveal(props.feed === null);
  return (
    <>
      {view.offlineWithData ? (
        <Alert tone="warning" title={t.offlineTitle} icon={<OfflineIcon />} className="mb-4">
          {t.offlineStale}
        </Alert>
      ) : null}
      {props.mapOpen ? (
        <div className="mb-4">
          <ResultsMap id={props.mapPanelId} hotels={props.hotels} criteria={props.criteria} />
        </div>
      ) : null}
      {props.feed === null ? (
        <>
          <ResultsList
            hotels={props.hotels}
            criteria={props.criteria}
            selectedAmenities={props.selectedAmenities}
            center={props.center}
            stale={view.stale}
          />
          <Pagination
            page={props.page}
            totalPages={getTotalPages(props.total, PAGE_SIZE)}
            getHref={props.pageHref}
            className="mt-8"
          />
        </>
      ) : (
        <HotelFeed
          hotels={props.hotels}
          total={props.total}
          headingId={props.headingId}
          criteria={props.criteria}
          selectedAmenities={props.selectedAmenities}
          center={props.center}
          stale={view.stale}
          feed={props.feed}
        />
      )}
    </>
  );
};

/** Escolhe o que mostrar para cada visão (`switch` exaustivo); não decide nada além disso. */
export const ResultsSection = (props: ResultsSectionProps) => {
  const t = useHotelSearchMessages().list;
  const { view } = props;
  switch (view.kind) {
    case "loading":
    case "out-of-range":
      return <ResultsSkeleton />;
    case "error":
      return (
        <RevealOnMount>
          <ResultsError onRetry={props.onRetry} retrying={props.retrying} />
        </RevealOnMount>
      );
    case "offline":
      return (
        <RevealOnMount>
          <Alert tone="warning" title={t.offlineTitle} icon={<OfflineIcon />}>
            {t.offlineNoData}
          </Alert>
        </RevealOnMount>
      );
    case "empty-destination":
      return <ResultsEmpty kind="destination" destination={props.destination} />;
    case "empty-filters":
      return <ResultsEmpty kind="filters" onClear={props.onClearFilters} />;
    case "results":
      return <ResultsContent {...props} view={view} />;
    default: {
      const unreachable: never = view;
      return unreachable;
    }
  }
};

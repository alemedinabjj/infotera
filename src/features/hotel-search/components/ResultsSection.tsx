import type { Amenity, Hotel } from "@/shared/api/schemas";
import { getTotalPages } from "@/shared/lib/pagination";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Alert, Pagination, WifiOffIcon } from "@/shared/ui";
import type { ResultsView } from "../model/results-view";
import { PAGE_SIZE } from "../model/search-filters";
import { ResultsEmpty } from "./ResultsEmpty";
import { ResultsError } from "./ResultsError";
import { ResultsList } from "./ResultsList";
import { ResultsSkeleton } from "./ResultsSkeleton";

type ResultsSectionProps = {
  view: ResultsView;
  hotels: readonly Hotel[];
  total: number;
  page: number;
  destination: string;
  criteria: SearchCriteria | null;
  selectedAmenities: readonly Amenity[];
  pageHref: (page: number) => string;
  onRetry: () => void;
  retrying: boolean;
  onClearFilters: () => void;
};

const OfflineIcon = () => <WifiOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />;

/** Escolhe o que mostrar para cada visão (`switch` exaustivo); não decide nada além disso. */
export const ResultsSection = (props: ResultsSectionProps) => {
  const { view } = props;
  switch (view.kind) {
    case "loading":
    case "out-of-range":
      return <ResultsSkeleton />;
    case "error":
      return <ResultsError onRetry={props.onRetry} retrying={props.retrying} />;
    case "offline":
      return (
        <Alert tone="warning" title="Você está sem internet." icon={<OfflineIcon />}>
          Os hotéis aparecem assim que a conexão voltar.
        </Alert>
      );
    case "empty-destination":
      return <ResultsEmpty kind="destination" destination={props.destination} />;
    case "empty-filters":
      return <ResultsEmpty kind="filters" onClear={props.onClearFilters} />;
    case "results":
      return (
        <>
          {view.offlineWithData ? (
            <Alert
              tone="warning"
              title="Você está sem internet."
              icon={<OfflineIcon />}
              className="mb-4"
            >
              Os resultados podem estar desatualizados.
            </Alert>
          ) : null}
          <ResultsList
            hotels={props.hotels}
            criteria={props.criteria}
            selectedAmenities={props.selectedAmenities}
            stale={view.stale}
          />
          <Pagination
            page={props.page}
            totalPages={getTotalPages(props.total, PAGE_SIZE)}
            getHref={props.pageHref}
            className="mt-8"
          />
        </>
      );
    default: {
      const unreachable: never = view;
      return unreachable;
    }
  }
};

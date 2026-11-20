import type { RefObject } from "react";
import type { FilterChange } from "../model/filter-change";
import type { ToolbarHeading, ToolbarStatus } from "../model/results-view";
import { countActiveFilters, type SearchFilters } from "../model/search-filters";
import { DistanceHelp } from "./DistanceHelp";
import { FiltersTrigger } from "./FiltersDrawer";
import { ListModeSelect } from "./ListModeSelect";
import { MapToggle } from "./MapToggle";
import { ResultsToolbar } from "./ResultsToolbar";
import { SortSelect } from "./SortSelect";

type ResultsControlsProps = {
  headingId: string;
  distanceHelpId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  heading: ToolbarHeading;
  status: ToolbarStatus;
  filters: SearchFilters;
  destination: string;
  onChange: (change: FilterChange) => void;
  onOpenFilters: () => void;
  /** Id do painel do mapa quando ele está no DOM. */
  mapPanelId: string | undefined;
};

/** Toolbar (contagem + Filtros, Ordenar por, Exibir) e o texto de ajuda da ordenação por distância. */
export const ResultsControls = ({
  headingId,
  distanceHelpId,
  headingRef,
  heading,
  status,
  filters,
  destination,
  onChange,
  onOpenFilters,
  mapPanelId,
}: ResultsControlsProps) => (
  <>
    <ResultsToolbar
      headingId={headingId}
      headingRef={headingRef}
      heading={heading}
      status={status}
      filtersTrigger={
        <FiltersTrigger
          className="min-[23rem]:col-span-2 min-[23rem]:justify-self-start sm:col-span-1"
          activeCount={countActiveFilters(filters)}
          onClick={onOpenFilters}
        />
      }
      listMode={
        <ListModeSelect
          value={filters.view}
          onChange={(value) => onChange({ type: "setView", value })}
        />
      }
      mapToggle={
        <MapToggle
          open={filters.map}
          controls={mapPanelId}
          onToggle={() => onChange({ type: "toggleMap" })}
          className="min-[23rem]:col-span-2 min-[23rem]:justify-self-start sm:col-span-1 lg:self-center"
        />
      }
      sort={
        <SortSelect
          value={filters.sort}
          describedBy={filters.sort === "distance" ? distanceHelpId : undefined}
          onChange={(value) => onChange({ type: "setSort", value })}
        />
      }
    />
    {filters.sort === "distance" ? (
      <DistanceHelp id={distanceHelpId} destination={destination} />
    ) : null}
  </>
);

"use client";

import { useCallback, useId, useState } from "react";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { ErrorBoundary } from "@/shared/ui";
import { focusResultsHeading } from "../hooks/useFocusOnPageChange";
import { useResultsController } from "../hooks/useResultsController";
import { describeAnnouncement, describeToolbar } from "../model/results-view";
import { countActiveFilters, serializeSearchFilters } from "../model/search-filters";
import { DistanceHelp } from "./DistanceHelp";
import { FiltersDrawer, FiltersTrigger } from "./FiltersDrawer";
import { FiltersPanel } from "./FiltersPanel";
import { ResultsError } from "./ResultsError";
import { ResultsSection } from "./ResultsSection";
import { ResultsToolbar } from "./ResultsToolbar";
import { SortSelect } from "./SortSelect";

type HotelSearchResultsProps = {
  destination: string;
  /** Critérios válidos (modo `stay`) ou `null` (modo `browse`: sem totais). */
  criteria: SearchCriteria | null;
};

/**
 * Lista de resultados: filtros (sidebar), toolbar e seção com error boundary. A lista é buscada no
 * cliente (`useQuery`); filtros, ordenação e página vêm da URL.
 */
export const HotelSearchResults = ({ destination, criteria }: HotelSearchResultsProps) => {
  const headingId = useId();
  const distanceHelpId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const { filters, update, pageHref, results, headingRef, sectionRef, sectionMinHeight, retry } =
    useResultsController(destination);
  const { view } = results;

  const toolbar = describeToolbar({
    view,
    slow: results.slow,
    total: results.total,
    page: filters.page,
  });
  const announcement = describeAnnouncement({
    view,
    slow: results.slow,
    total: results.total,
    destination,
  });
  const resetKey = `${destination}?${serializeSearchFilters(filters).toString()}`;

  return (
    <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-8">
      <FiltersPanel filters={filters} onChange={update} />
      <section
        ref={sectionRef}
        aria-labelledby={headingId}
        style={{ minHeight: sectionMinHeight }}
        className="flex min-w-0 flex-col gap-4"
      >
        <p className="sr-only" aria-live="polite">
          {drawerOpen ? "" : announcement}
        </p>
        <ResultsToolbar
          headingId={headingId}
          headingRef={headingRef}
          heading={toolbar.heading}
          status={toolbar.status}
          filtersTrigger={
            <FiltersTrigger
              activeCount={countActiveFilters(filters)}
              onClick={() => setDrawerOpen(true)}
            />
          }
          sort={
            <SortSelect
              value={filters.sort}
              describedBy={filters.sort === "distance" ? distanceHelpId : undefined}
              onChange={(value) => update({ type: "setSort", value })}
            />
          }
        />
        {filters.sort === "distance" ? (
          <DistanceHelp id={distanceHelpId} destination={destination} />
        ) : null}
        <ErrorBoundary
          resetKeys={[resetKey]}
          fallback={({ reset }) => <ResultsError onRetry={reset} retrying={false} />}
        >
          <ResultsSection
            view={view}
            hotels={results.items}
            center={results.center}
            total={results.total}
            page={filters.page}
            destination={destination}
            criteria={criteria}
            selectedAmenities={filters.amenities}
            pageHref={pageHref}
            onRetry={retry}
            retrying={results.isFetching}
            onClearFilters={() => {
              update({ type: "clear" });
              focusResultsHeading(headingRef.current);
            }}
          />
        </ErrorBoundary>
      </section>
      <FiltersDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        filters={filters}
        onChange={update}
        view={view}
        total={results.total}
        announcement={announcement}
      />
    </div>
  );
};

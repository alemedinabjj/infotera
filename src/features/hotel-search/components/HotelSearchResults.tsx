"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useCallback, useId, useRef, useState } from "react";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { ErrorBoundary } from "@/shared/ui";
import { useFocusAfterRetry } from "../hooks/useFocusAfterRetry";
import { focusResultsHeading, useFocusOnPageChange } from "../hooks/useFocusOnPageChange";
import { useHotelResults } from "../hooks/useHotelResults";
import { useSearchFilters } from "../hooks/useSearchFilters";
import { describeAnnouncement, describeToolbar } from "../model/results-view";
import { countActiveFilters, serializeSearchFilters } from "../model/search-filters";
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const { filters, update, replacePage, pageHref } = useSearchFilters();
  const results = useHotelResults(destination, filters, replacePage);
  const { view } = results;
  useFocusOnPageChange({
    headingRef,
    page: filters.page,
    filtersKey: serializeSearchFilters({ ...filters, page: 1 }).toString(),
    ready: view.kind === "results" && !view.stale,
    silent: view.kind === "out-of-range",
  });

  const markRetried = useFocusAfterRetry({
    headingRef,
    ready: view.kind === "results" && !view.stale,
    failed: view.kind === "error" && !results.isFetching,
  });

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
      <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
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
              onChange={(value) => update({ type: "setSort", value })}
            />
          }
        />
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              resetKeys={[resetKey]}
              fallback={({ reset: resetBoundary }) => (
                <ResultsError onRetry={resetBoundary} retrying={false} />
              )}
            >
              <ResultsSection
                view={view}
                hotels={results.items}
                total={results.total}
                page={filters.page}
                destination={destination}
                criteria={criteria}
                selectedAmenities={filters.amenities}
                pageHref={pageHref}
                onRetry={() => {
                  markRetried();
                  results.retry();
                }}
                retrying={results.isFetching}
                onClearFilters={() => {
                  update({ type: "clear" });
                  focusResultsHeading(headingRef.current);
                }}
              />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
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

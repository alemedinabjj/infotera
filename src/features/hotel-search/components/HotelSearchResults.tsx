"use client";

import { useCallback, useId, useState } from "react";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { ErrorBoundary, SkipLink } from "@/shared/ui";
import { focusResultsHeading } from "../hooks/useFocusOnPageChange";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import { useRememberSearch } from "../hooks/useRememberSearch";
import { useResultsController } from "../hooks/useResultsController";
import { useResultsText } from "../hooks/useResultsText";
import { serializeSearchFilters } from "../model/search-filters";
import { FiltersDrawer } from "./FiltersDrawer";
import { FiltersPanel } from "./FiltersPanel";
import { ResultsControls } from "./ResultsControls";
import { ResultsError } from "./ResultsError";
import { ResultsSection } from "./ResultsSection";

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
  const t = useHotelSearchMessages();
  useRememberSearch(criteria);
  const headingId = useId();
  const distanceHelpId = useId();
  const mapPanelId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const { filters, update, pageHref, results, headingRef, sectionRef, sectionMinHeight, retry } =
    useResultsController(destination);
  const { view } = results;

  const { toolbar, announcement } = useResultsText(results, filters.page, destination);
  const resetKey = `${destination}?${serializeSearchFilters(filters).toString()}`;

  return (
    <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-8">
      <SkipLink
        targetId={headingId}
        label={t.list.skipToResults}
        onClick={(event) => {
          event.preventDefault();
          focusResultsHeading(headingRef.current);
        }}
      />
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
        <ResultsControls
          headingId={headingId}
          distanceHelpId={distanceHelpId}
          headingRef={headingRef}
          heading={toolbar.heading}
          status={toolbar.status}
          filters={filters}
          destination={destination}
          onChange={update}
          onOpenFilters={() => setDrawerOpen(true)}
          mapPanelId={filters.map && view.kind === "results" ? mapPanelId : undefined}
        />
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
            headingId={headingId}
            feed={results.feed}
            mapOpen={filters.map}
            mapPanelId={mapPanelId}
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

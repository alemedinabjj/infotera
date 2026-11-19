"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type RefObject, useEffect, useRef } from "react";
import { seedViewSwitch } from "../api/view-switch";
import type { FilterChange } from "../model/filter-change";
import { serializeSearchFilters } from "../model/search-filters";
import type { ResultsModel } from "./results-model";
import { useFocusAfterRetry } from "./useFocusAfterRetry";
import { useFocusOnPageChange } from "./useFocusOnPageChange";
import { useHotelFeed } from "./useHotelFeed";
import { useHotelResults } from "./useHotelResults";
import { useKeepResultsHeight } from "./useKeepResultsHeight";
import { useSearchFilters } from "./useSearchFilters";

type UseResultsController = Omit<ReturnType<typeof useSearchFilters>, "update"> & {
  /** Aplica a mudança de filtro guardando antes a altura da coluna de resultados. */
  update: (change: FilterChange) => void;
  /** Modelo do modo ativo (páginas ou rolagem contínua). */
  results: ResultsModel;
  headingRef: RefObject<HTMLHeadingElement | null>;
  sectionRef: RefObject<HTMLElement | null>;
  sectionMinHeight: number | undefined;
  /** Chamar no clique de "Tentar de novo" (leva o foco ao título quando a lista chegar). */
  retry: () => void;
};

/**
 * Liga filtros da URL, query da lista e os comportamentos de foco/altura da página de resultados,
 * para o componente só apresentar.
 */
export const useResultsController = (destination: string): UseResultsController => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const client = useQueryClient();
  const { filters, update: applyChange, replacePage, pageHref } = useSearchFilters();
  // Os dois hooks ficam montados (só um busca): a toolbar e o foco no select nunca desmontam.
  const infinite = filters.view === "infinite";
  const pagesModel = useHotelResults(destination, filters, !infinite);
  const feedModel = useHotelFeed(destination, filters, infinite);
  const results = infinite ? feedModel : pagesModel;
  const { view } = results;
  const outOfRangeTo = view.kind === "out-of-range" ? view.lastPage : null;

  // Página fora do intervalo vira a última via replace (sem empilhar histórico).
  useEffect(() => {
    if (outOfRangeTo !== null) replacePage(outOfRangeTo);
  }, [outOfRangeTo, replacePage]);

  const filtersKey = serializeSearchFilters({ ...filters, page: 1 }).toString();
  const keep = useKeepResultsHeight({ destination, page: filters.page, filtersKey });
  const ready = view.kind === "results" && !view.stale;

  useFocusOnPageChange({
    headingRef,
    page: filters.page,
    filtersKey,
    ready,
    silent: view.kind === "out-of-range",
  });
  const markRetried = useFocusAfterRetry({
    headingRef,
    ready,
    failed: view.kind === "error" && !results.isFetching,
  });

  return {
    filters,
    pageHref,
    replacePage,
    results,
    headingRef,
    sectionRef: keep.ref,
    sectionMinHeight: keep.minHeight,
    update: (change) => {
      keep.hold();
      if (change.type === "setView") seedViewSwitch(client, destination, filters, change.value);
      applyChange(change);
    },
    retry: () => {
      markRetried();
      results.retry();
    },
  };
};

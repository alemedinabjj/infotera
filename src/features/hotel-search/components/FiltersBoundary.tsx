"use client";

import { ErrorBoundary } from "@/shared/ui";
import type { FilterChange } from "../model/filter-change";
import { type SearchFilters, serializeSearchFilters } from "../model/search-filters";
import { FiltersError } from "./FiltersError";
import { FiltersFields } from "./FiltersFields";

type FiltersBoundaryProps = {
  filters: SearchFilters;
  onChange: (change: FilterChange) => void;
};

/**
 * Filtros com error boundary própria (sidebar e sheet): um erro de renderização num filtro troca só
 * esta seção por um aviso, sem derrubar a lista. Mudar os filtros também limpa o erro.
 */
export const FiltersBoundary = ({ filters, onChange }: FiltersBoundaryProps) => (
  <ErrorBoundary
    resetKeys={[serializeSearchFilters(filters).toString()]}
    fallback={({ reset }) => <FiltersError onRetry={reset} />}
  >
    <FiltersFields filters={filters} onChange={onChange} />
  </ErrorBoundary>
);

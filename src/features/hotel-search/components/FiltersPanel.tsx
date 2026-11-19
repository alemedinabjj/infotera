"use client";

import type { FilterChange } from "../model/filter-change";
import { hasActiveFilters, type SearchFilters } from "../model/search-filters";
import { ClearFiltersButton } from "./ClearFiltersButton";
import { FiltersFields } from "./FiltersFields";

type FiltersPanelProps = {
  filters: SearchFilters;
  onChange: (change: FilterChange) => void;
};

/** Sidebar de filtros (≥ `lg`): `aside` com o cabeçalho, "Limpar filtros" e os grupos. */
export const FiltersPanel = ({ filters, onChange }: FiltersPanelProps) => (
  <aside
    aria-labelledby="filters-heading"
    className="hidden rounded-card border border-border bg-surface p-5 shadow-card lg:block"
  >
    <div className="mb-4 flex min-h-11 items-center justify-between">
      <h2 id="filters-heading" className="text-lg font-semibold text-fg">
        Filtros
      </h2>
      <ClearFiltersButton
        active={hasActiveFilters(filters)}
        onClear={() => onChange({ type: "clear" })}
      />
    </div>
    <FiltersFields filters={filters} onChange={onChange} />
  </aside>
);

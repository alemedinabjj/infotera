"use client";

import type { FilterChange } from "../model/filter-change";
import type { SearchFilters } from "../model/search-filters";
import { AmenitiesFilter } from "./AmenitiesFilter";
import { PriceFilter } from "./PriceFilter";
import { RatingFilter } from "./RatingFilter";
import { TypeFilter } from "./TypeFilter";

type FiltersFieldsProps = {
  filters: SearchFilters;
  onChange: (change: FilterChange) => void;
};

/** Os quatro grupos de filtro (sidebar e bottom-sheet usam o mesmo conteúdo). */
export const FiltersFields = ({ filters, onChange }: FiltersFieldsProps) => (
  <div className="divide-y divide-border">
    <PriceFilter filters={filters} onChange={onChange} />
    <RatingFilter value={filters.minRating} onChange={onChange} />
    <TypeFilter selected={filters.types} onChange={onChange} />
    <AmenitiesFilter selected={filters.amenities} onChange={onChange} />
  </div>
);

"use client";

import { useId } from "react";
import { usePriceDraft } from "../hooks/usePriceDraft";
import type { FilterChange } from "../model/filter-change";
import {
  describePriceSummary,
  type PriceDraft,
  type PriceThumb,
  priceValueText,
} from "../model/price-range";
import { PRICE_RANGE, type SearchFilters } from "../model/search-filters";
import { FilterGroup } from "./FilterGroup";

type PriceFilterProps = {
  filters: Pick<SearchFilters, "minPrice" | "maxPrice">;
  onChange: (change: FilterChange) => void;
};

type ThumbProps = {
  thumb: PriceThumb;
  label: string;
  value: number;
  onMove: (value: number) => void;
};

const Thumb = ({ thumb, label, value, onMove }: ThumbProps) => {
  const id = useId();
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={PRICE_RANGE.min}
        max={PRICE_RANGE.max}
        step={PRICE_RANGE.step}
        value={value}
        aria-valuetext={priceValueText(thumb, value)}
        onChange={(event) => onMove(event.currentTarget.valueAsNumber)}
        className="h-11 w-full cursor-pointer accent-primary"
      />
    </div>
  );
};

/**
 * Faixa de preço: dois sliders nativos (mínimo e máximo). O resumo em texto muda na hora; a URL
 * (e a lista) só 400 ms depois do último movimento.
 */
export const PriceFilter = ({ filters, onChange }: PriceFilterProps) => {
  const url: PriceDraft = { min: filters.minPrice, max: filters.maxPrice };
  const { draft, move } = usePriceDraft(url, ({ min, max }) =>
    onChange({ type: "setPrice", min, max }),
  );

  return (
    <FilterGroup legend="Preço por noite">
      <p aria-hidden="true" className="mb-1 text-base font-semibold text-fg tabular-nums">
        {describePriceSummary(draft)}
      </p>
      <Thumb thumb="min" label="Mínimo" value={draft.min} onMove={(value) => move("min", value)} />
      <Thumb thumb="max" label="Máximo" value={draft.max} onMove={(value) => move("max", value)} />
    </FilterGroup>
  );
};

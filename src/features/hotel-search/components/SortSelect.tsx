"use client";

import { useId } from "react";
import { useLocale } from "@/shared/i18n/client";
import { Select } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import { sortLabel } from "../model/labels";
import { SORT_OPTIONS, type SortOption } from "../model/search-filters";

type SortSelectProps = {
  value: SortOption;
  onChange: (sort: SortOption) => void;
  /** Id do texto de ajuda que descreve a ordenação atual. */
  describedBy?: string;
};

/** Ordenação em `<select>` nativo com rótulo visível ("Ordenar por"). */
export const SortSelect = ({ value, onChange, describedBy }: SortSelectProps) => {
  const id = useId();
  const t = useHotelSearchMessages();
  const locale = useLocale();
  return (
    <div className="flex min-w-0 flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-3">
      <label htmlFor={id} className="text-sm font-medium whitespace-nowrap text-fg">
        {t.controls.sortBy}
      </label>
      <Select
        id={id}
        value={value}
        aria-describedby={describedBy}
        className="lg:w-56"
        onChange={(event) => {
          const next = SORT_OPTIONS.find((option) => option === event.currentTarget.value);
          if (next) onChange(next);
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {sortLabel(option, locale)}
          </option>
        ))}
      </Select>
    </div>
  );
};

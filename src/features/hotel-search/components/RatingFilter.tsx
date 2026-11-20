"use client";

import { useId } from "react";
import { useLocale } from "@/shared/i18n/client";
import { formatRating, ratingLabel } from "@/shared/lib/format";
import { Radio } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import type { FilterChange } from "../model/filter-change";
import type { MinRating } from "../model/search-filters";
import { FilterGroup } from "./FilterGroup";

type RatingFilterProps = {
  value: MinRating | null;
  onChange: (change: FilterChange) => void;
};

const OPTIONS: { value: MinRating }[] = [{ value: 4.5 }, { value: 4 }, { value: 3.5 }];

/** Nota mínima em opções fechadas (radios): qualquer, 4,5, 4,0 ou 3,5 ou mais. */
export const RatingFilter = ({ value, onChange }: RatingFilterProps) => {
  const name = useId();
  const t = useHotelSearchMessages().controls;
  const locale = useLocale();
  return (
    <FilterGroup legend={t.ratingLegend}>
      <Radio
        name={name}
        label={t.anyRating}
        checked={value === null}
        onChange={() => onChange({ type: "setRating", value: null })}
      />
      {OPTIONS.map((option) => (
        <Radio
          key={option.value}
          name={name}
          label={
            <>
              {t.orMore({ value: formatRating(option.value, locale) })}{" "}
              <span className="text-fg-muted">{ratingLabel(option.value, locale)}</span>
            </>
          }
          checked={value === option.value}
          onChange={() => onChange({ type: "setRating", value: option.value })}
        />
      ))}
    </FilterGroup>
  );
};

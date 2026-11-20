"use client";

import { useId } from "react";
import { ratingLabel } from "@/shared/lib/format";
import { Radio } from "@/shared/ui";
import type { FilterChange } from "../model/filter-change";
import type { MinRating } from "../model/search-filters";
import { FilterGroup } from "./FilterGroup";

type RatingFilterProps = {
  value: MinRating | null;
  onChange: (change: FilterChange) => void;
};

const OPTIONS: { value: MinRating; text: string }[] = [
  { value: 4.5, text: "4,5 ou mais" },
  { value: 4, text: "4,0 ou mais" },
  { value: 3.5, text: "3,5 ou mais" },
];

/** Nota mínima em opções fechadas (radios): qualquer, 4,5, 4,0 ou 3,5 ou mais. */
export const RatingFilter = ({ value, onChange }: RatingFilterProps) => {
  const name = useId();
  return (
    <FilterGroup legend="Nota mínima">
      <Radio
        name={name}
        label="Qualquer nota"
        checked={value === null}
        onChange={() => onChange({ type: "setRating", value: null })}
      />
      {OPTIONS.map((option) => (
        <Radio
          key={option.value}
          name={name}
          label={
            <>
              {option.text} <span className="text-fg-muted">{ratingLabel(option.value)}</span>
            </>
          }
          checked={value === option.value}
          onChange={() => onChange({ type: "setRating", value: option.value })}
        />
      ))}
    </FilterGroup>
  );
};

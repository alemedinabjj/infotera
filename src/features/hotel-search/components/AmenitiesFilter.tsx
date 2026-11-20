"use client";

import type { Amenity } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { AMENITY_DISPLAY_ORDER, amenityLabel } from "@/shared/lib/labels";
import { Checkbox } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import type { FilterChange } from "../model/filter-change";
import { FilterGroup } from "./FilterGroup";

type AmenitiesFilterProps = {
  selected: readonly Amenity[];
  onChange: (change: FilterChange) => void;
};

/** Comodidades (múltiplo, E: o hotel precisa ter todas). As 15 ficam visíveis. */
export const AmenitiesFilter = ({ selected, onChange }: AmenitiesFilterProps) => {
  const t = useHotelSearchMessages();
  const locale = useLocale();
  return (
    <FilterGroup legend={t.controls.amenitiesLegend}>
      {AMENITY_DISPLAY_ORDER.map((amenity) => (
        <Checkbox
          key={amenity}
          label={amenityLabel(amenity, locale)}
          checked={selected.includes(amenity)}
          onChange={() => onChange({ type: "toggleAmenity", value: amenity })}
        />
      ))}
    </FilterGroup>
  );
};

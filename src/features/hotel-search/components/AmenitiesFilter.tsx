import type { Amenity } from "@/shared/api/schemas";
import { AMENITY_DISPLAY_ORDER, amenityLabel } from "@/shared/lib/labels";
import { Checkbox } from "@/shared/ui";
import type { FilterChange } from "../model/filter-change";
import { FilterGroup } from "./FilterGroup";

type AmenitiesFilterProps = {
  selected: readonly Amenity[];
  onChange: (change: FilterChange) => void;
};

/** Comodidades (múltiplo, E: o hotel precisa ter todas). As 15 ficam visíveis. */
export const AmenitiesFilter = ({ selected, onChange }: AmenitiesFilterProps) => (
  <FilterGroup legend="Comodidades">
    {AMENITY_DISPLAY_ORDER.map((amenity) => (
      <Checkbox
        key={amenity}
        label={amenityLabel(amenity)}
        checked={selected.includes(amenity)}
        onChange={() => onChange({ type: "toggleAmenity", value: amenity })}
      />
    ))}
  </FilterGroup>
);

import type { PropertyType } from "@/shared/api/schemas";
import { Checkbox } from "@/shared/ui";
import type { FilterChange } from "../model/filter-change";
import { PROPERTY_TYPE_DISPLAY_ORDER, propertyTypeLabel } from "../model/labels";
import { FilterGroup } from "./FilterGroup";

type TypeFilterProps = {
  selected: readonly PropertyType[];
  onChange: (change: FilterChange) => void;
};

/** Tipo de hospedagem (múltiplo, OU entre os marcados). */
export const TypeFilter = ({ selected, onChange }: TypeFilterProps) => (
  <FilterGroup legend="Tipo de hospedagem">
    {PROPERTY_TYPE_DISPLAY_ORDER.map((type) => (
      <Checkbox
        key={type}
        label={propertyTypeLabel(type)}
        checked={selected.includes(type)}
        onChange={() => onChange({ type: "toggleType", value: type })}
      />
    ))}
  </FilterGroup>
);

"use client";

import { useId } from "react";
import { useLocale } from "@/shared/i18n/client";
import { Select } from "@/shared/ui";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import { listModeLabel } from "../model/labels";
import { LIST_MODES, type ListMode } from "../model/search-filters";

type ListModeSelectProps = { value: ListMode; onChange: (mode: ListMode) => void };

/** Modo de exibição ("Exibir": em páginas ou rolagem contínua) em `<select>` nativo com rótulo visível. */
export const ListModeSelect = ({ value, onChange }: ListModeSelectProps) => {
  const id = useId();
  const t = useHotelSearchMessages();
  const locale = useLocale();
  return (
    <div className="flex min-w-0 flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-3">
      <label htmlFor={id} className="text-sm font-medium whitespace-nowrap text-fg">
        {t.controls.display}
      </label>
      <Select
        id={id}
        value={value}
        className="lg:w-52"
        onChange={(event) => {
          const next = LIST_MODES.find((option) => option === event.currentTarget.value);
          if (next) onChange(next);
        }}
      >
        {LIST_MODES.map((option) => (
          <option key={option} value={option}>
            {listModeLabel(option, locale)}
          </option>
        ))}
      </Select>
    </div>
  );
};

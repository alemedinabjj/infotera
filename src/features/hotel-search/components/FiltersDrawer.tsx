"use client";

import { Button, Dialog, FilterIcon, Spinner } from "@/shared/ui";
import { useCloseOnDesktop } from "../hooks/useCloseOnDesktop";
import type { FilterChange } from "../model/filter-change";
import type { ResultsView } from "../model/results-view";
import { describeSheetAction } from "../model/results-view";
import { hasActiveFilters, type SearchFilters } from "../model/search-filters";
import { ClearFiltersButton } from "./ClearFiltersButton";
import { FiltersFields } from "./FiltersFields";

type FiltersDrawerProps = {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onChange: (change: FilterChange) => void;
  view: ResultsView;
  total: number;
  /** Mesmo texto do anunciador principal (que fica mudo com o sheet aberto). */
  announcement: string;
};

/**
 * Filtros no celular: bottom-sheet (`Dialog placement="sheet"`). Os filtros aplicam na hora (a
 * lista atrás muda); o primário só fecha e mostra o resultado esperado.
 */
export const FiltersDrawer = ({
  open,
  onClose,
  filters,
  onChange,
  view,
  total,
  announcement,
}: FiltersDrawerProps) => {
  useCloseOnDesktop(open, onClose);
  const action = describeSheetAction(view, total);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Filtros"
      closeLabel="Fechar filtros"
      placement="sheet"
      closeOnBackdrop
      initialFocus="input[type='range']"
      footer={
        <>
          <ClearFiltersButton
            active={hasActiveFilters(filters)}
            onClear={() => onChange({ type: "clear" })}
            className="flex-1"
          />
          <Button
            className="flex-1"
            leftIcon={action.updating ? <Spinner /> : undefined}
            onClick={onClose}
          >
            {action.text}
          </Button>
        </>
      }
    >
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <FiltersFields filters={filters} onChange={onChange} />
    </Dialog>
  );
};

type FiltersTriggerProps = { activeCount: number; onClick: () => void };

/** Gatilho do sheet (só abaixo de `lg`): `Filtros` ou `Filtros (3)`. */
export const FiltersTrigger = ({ activeCount, onClick }: FiltersTriggerProps) => (
  <Button
    variant="secondary"
    aria-haspopup="dialog"
    className="lg:hidden"
    leftIcon={<FilterIcon className="size-5" />}
    onClick={onClick}
  >
    {activeCount > 0 ? `Filtros (${activeCount})` : "Filtros"}
  </Button>
);

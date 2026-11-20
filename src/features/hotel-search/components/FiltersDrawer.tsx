"use client";

import { useResetOnHide } from "@/shared/hooks/useResetOnHide";
import { useLocale } from "@/shared/i18n/client";
import { cn } from "@/shared/lib/cn";
import { Button, Dialog, FilterIcon, Spinner } from "@/shared/ui";
import { useCloseOnDesktop } from "../hooks/useCloseOnDesktop";
import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import type { FilterChange } from "../model/filter-change";
import type { ResultsView } from "../model/results-view";
import { describeSheetAction } from "../model/results-view";
import { hasActiveFilters, type SearchFilters } from "../model/search-filters";
import { ClearFiltersButton } from "./ClearFiltersButton";
import { FiltersBoundary } from "./FiltersBoundary";

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
  // Activity (cacheComponents) esconde a rota em vez de desmontar: ao voltar o sheet não pode estar aberto.
  useResetOnHide(onClose);
  const t = useHotelSearchMessages().controls;
  const locale = useLocale();
  const action = describeSheetAction(view, total, locale);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.filters}
      closeLabel={t.closeFilters}
      placement="sheet"
      closeOnBackdrop
      initialFocus="input[type='range']"
      footer={
        <>
          <ClearFiltersButton
            active={hasActiveFilters(filters)}
            onClear={() => onChange({ type: "clear" })}
            className="shrink-0 whitespace-nowrap"
          />
          {/* Largura fixa (restante do rodapé): o rótulo vira "Atualizando…" sem mexer no botão. */}
          <Button
            className="min-w-0 flex-1 basis-0 px-3 whitespace-nowrap"
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
      <FiltersBoundary filters={filters} onChange={onChange} />
    </Dialog>
  );
};

type FiltersTriggerProps = { activeCount: number; onClick: () => void; className?: string };

/** Gatilho do sheet (só abaixo de `lg`): `Filtros` ou `Filtros (3)`. */
export const FiltersTrigger = ({ activeCount, onClick, className }: FiltersTriggerProps) => {
  const t = useHotelSearchMessages().controls;
  return (
    <Button
      variant="secondary"
      aria-haspopup="dialog"
      className={cn("lg:hidden", className)}
      leftIcon={<FilterIcon className="size-5" />}
      onClick={onClick}
    >
      {activeCount > 0 ? t.filtersWithCount({ count: activeCount }) : t.filters}
    </Button>
  );
};

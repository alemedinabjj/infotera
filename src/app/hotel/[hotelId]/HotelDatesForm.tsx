"use client";

import { SearchForm } from "@/features/search-form";
import { markFocusAfterNavigation } from "@/shared/lib/focus-after-navigation";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";

type HotelDatesFormProps = {
  hotelId: number;
  destination: string;
  criteria: SearchCriteria | null;
  /** `id` do título do painel (nome acessível do formulário). */
  labelledBy: string;
};

const submitHref = (hotelId: number, criteria: SearchCriteria): string => {
  const href = hotelHref(hotelId, criteria);
  // Só o envio válido chega aqui: o foco vai ao h2 "Quartos" quando a página chegar a este href.
  markFocusAfterNavigation(href);
  return href;
};

/**
 * Formulário de datas do detalhe: o `SearchForm` da F2 com destino fixo, que envia de volta para
 * `/hotel/{id}?<critérios>` (sem rolar). Client porque `getSubmitHref` é uma função.
 */
export const HotelDatesForm = ({
  hotelId,
  destination,
  criteria,
  labelledBy,
}: HotelDatesFormProps) => (
  <SearchForm
    fixedDestination={destination}
    initialCriteria={criteria ?? { destination }}
    getSubmitHref={(next) => submitHref(hotelId, next)}
    showRecentSearches={false}
    submitLabel="Ver disponibilidade"
    submitLoadingText="Atualizando…"
    labelledBy={labelledBy}
  />
);

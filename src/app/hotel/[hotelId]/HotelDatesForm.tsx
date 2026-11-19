"use client";

import { SearchForm } from "@/features/search-form";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";

type HotelDatesFormProps = {
  hotelId: number;
  destination: string;
  criteria: SearchCriteria | null;
  /** `id` do título do painel (nome acessível do formulário). */
  labelledBy: string;
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
    getSubmitHref={(next) => hotelHref(hotelId, next)}
    showRecentSearches={false}
    submitLabel="Ver disponibilidade"
    submitLoadingText="Atualizando…"
    labelledBy={labelledBy}
  />
);

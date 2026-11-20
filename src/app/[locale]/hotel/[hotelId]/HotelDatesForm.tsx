"use client";

import type { DatesFormLabels } from "@/features/hotel-details";
import { SearchForm } from "@/features/search-form";
import { useLocale } from "@/shared/i18n/client";
import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { markFocusAfterNavigation } from "@/shared/lib/focus-after-navigation";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";

type HotelDatesFormProps = {
  hotelId: number;
  destination: string;
  criteria: SearchCriteria | null;
  /** `id` do título do painel (nome acessível do formulário). */
  labelledBy: string;
  /** Textos do botão, no idioma da rota (vêm da feature, pelo servidor). */
  labels: DatesFormLabels;
};

const submitHref = (locale: Locale, hotelId: number, criteria: SearchCriteria): string => {
  const href = localizePath(locale, hotelHref(hotelId, criteria));
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
  labels,
}: HotelDatesFormProps) => {
  const locale = useLocale();
  return (
    <SearchForm
      fixedDestination={destination}
      initialCriteria={criteria ?? { destination }}
      getSubmitHref={(next) => submitHref(locale, hotelId, next)}
      showRecentSearches={false}
      submitLabel={labels.submit}
      submitLoadingText={labels.submitLoading}
      labelledBy={labelledBy}
    />
  );
};

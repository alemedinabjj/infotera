"use client";

import { SearchForm } from "@/features/search-form";
import { useLocale } from "@/shared/i18n/client";
import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { markFocusAfterNavigation } from "@/shared/lib/focus-after-navigation";
import { type SearchCriteria, searchCriteriaToQueryString } from "@/shared/lib/search-params";

type SearchEditFormProps = {
  /** `null` no modo `browse`: só o destino vem preenchido. */
  criteria: SearchCriteria | null;
  destination: string;
  /** `id` do título do painel (nome acessível do formulário). */
  labelledBy: string;
};

const submitHref = (locale: Locale, criteria: SearchCriteria): string => {
  const href = localizePath(locale, `/search?${searchCriteriaToQueryString(criteria)}`);
  // Só o envio válido chega aqui: o foco vai ao h1 quando a página chegar a este href.
  markFocusAfterNavigation(href);
  return href;
};

/**
 * Formulário do painel "Alterar busca": o `SearchForm` da F2 que, no envio válido, marca o destino
 * para o foco voltar ao h1. Client porque `getSubmitHref` é uma função.
 */
export const SearchEditForm = ({ criteria, destination, labelledBy }: SearchEditFormProps) => {
  const locale = useLocale();
  return (
    <SearchForm
      initialCriteria={criteria ?? { destination }}
      getSubmitHref={(next) => submitHref(locale, next)}
      showRecentSearches={false}
      labelledBy={labelledBy}
    />
  );
};

"use client";

import { SearchForm } from "@/features/search-form";
import { markFocusAfterNavigation } from "@/shared/lib/focus-after-navigation";
import { type SearchCriteria, searchCriteriaToQueryString } from "@/shared/lib/search-params";

type SearchEditFormProps = {
  /** `null` no modo `browse`: só o destino vem preenchido. */
  criteria: SearchCriteria | null;
  destination: string;
  /** `id` do título do painel (nome acessível do formulário). */
  labelledBy: string;
};

const submitHref = (criteria: SearchCriteria): string => {
  const href = `/search?${searchCriteriaToQueryString(criteria)}`;
  // Só o envio válido chega aqui: o foco vai ao h1 quando a página chegar a este href.
  markFocusAfterNavigation(href);
  return href;
};

/**
 * Formulário do painel "Alterar busca": o `SearchForm` da F2 que, no envio válido, marca o destino
 * para o foco voltar ao h1. Client porque `getSubmitHref` é uma função.
 */
export const SearchEditForm = ({ criteria, destination, labelledBy }: SearchEditFormProps) => (
  <SearchForm
    initialCriteria={criteria ?? { destination }}
    getSubmitHref={submitHref}
    showRecentSearches={false}
    labelledBy={labelledBy}
  />
);

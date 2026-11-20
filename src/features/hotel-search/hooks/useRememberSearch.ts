"use client";

import { useEffect } from "react";
import { rememberSearch } from "@/shared/lib/last-search";
import type { SearchCriteria } from "@/shared/lib/search-params";

/**
 * Guarda os critérios da busca (modo `stay`) para a comparação e os favoritos abrirem os hotéis com
 * as mesmas datas. Só destino, datas e hóspedes: nada pessoal. Gravar de novo é idempotente.
 */
export const useRememberSearch = (criteria: SearchCriteria | null): void => {
  useEffect(() => {
    if (criteria) rememberSearch(criteria);
  }, [criteria]);
};

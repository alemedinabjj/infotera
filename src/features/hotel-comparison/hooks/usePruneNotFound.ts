"use client";

import { useEffect, useState } from "react";
import { missingIds } from "@/shared/api/ids";
import type { Hotel } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { dropMissingIds } from "./compare-url";

/**
 * Remove da URL e da bandeja os hotéis que a API não devolveu (uma vez cada) e devolve quantos
 * saíram, para o aviso continuar na tela depois que os ids somem da URL. Ignora dados de
 * `placeholderData` (de outra lista de ids).
 */
export const usePruneNotFound = (
  ids: readonly number[],
  hotels: readonly Hotel[] | undefined,
  settled: boolean,
  criteria: SearchCriteria | null,
): number => {
  const locale = useLocale();
  const [removed, setRemoved] = useState(0);
  useEffect(() => {
    if (!settled || !hotels) return;
    const missing = missingIds(ids, hotels);
    if (missing.length === 0) return;
    dropMissingIds(locale, ids, missing, criteria);
    setRemoved((count) => count + missing.length);
  }, [locale, ids, hotels, settled, criteria]);
  return removed;
};

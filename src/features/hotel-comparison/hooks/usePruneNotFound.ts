"use client";

import { useEffect, useState } from "react";
import { missingIds } from "@/shared/api/ids";
import type { Hotel } from "@/shared/api/schemas";
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
  const [removed, setRemoved] = useState(0);
  const missing = settled && hotels ? missingIds(ids, hotels) : [];
  const key = missing.join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` resume `missing`/`ids`
  useEffect(() => {
    if (missing.length === 0) return;
    dropMissingIds(ids, missing, criteria);
    setRemoved((count) => count + missing.length);
  }, [key]);
  return removed;
};

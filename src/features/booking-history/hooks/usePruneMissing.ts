"use client";

import { useEffect, useRef, useState } from "react";
import { removeManyFromHistory } from "@/shared/lib/booking-history";
import type { HistoryRow } from "../model/history-rows";

/**
 * Tira do storage, uma única vez, os ids que a API respondeu `404` e devolve quantos saíram
 * (para o aviso da página). Erro de rede/5xx nunca chega aqui.
 */
export const usePruneMissing = (rows: readonly HistoryRow[]): number => {
  const missingKey = rows
    .flatMap((row) => (row.kind === "missing" ? [row.entry.id] : []))
    .join("|");
  const handled = useRef(new Set<string>());
  const [vanished, setVanished] = useState(0);
  useEffect(() => {
    const missing = missingKey === "" ? [] : missingKey.split("|");
    const fresh = missing.filter((id) => !handled.current.has(id));
    if (fresh.length === 0) return;
    for (const id of fresh) handled.current.add(id);
    removeManyFromHistory(fresh);
    setVanished((count) => count + fresh.length);
  }, [missingKey]);
  return vanished;
};

"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { movePriceThumb, type PriceDraft, type PriceThumb } from "../model/price-range";

/** Atraso entre o último movimento do slider e a gravação na URL. */
export const PRICE_COMMIT_DELAY_MS = 400;

type UsePriceDraft = {
  draft: PriceDraft;
  move: (thumb: PriceThumb, value: number) => void;
};

/**
 * Estado local dos dois sliders: o valor muda na hora (resumo e `aria-valuetext`), a URL só 400 ms
 * depois do último movimento, e volta a sincronizar quando a URL muda por fora (limpar, Voltar).
 * Só grava o que a pessoa realmente deixou: um valor debounced que já ficou para trás (porque a
 * URL mudou por fora) nunca é regravado.
 */
export const usePriceDraft = (
  url: PriceDraft,
  onCommit: (draft: PriceDraft) => void,
): UsePriceDraft => {
  const [draft, setDraft] = useState(url);
  const [previousUrl, setPreviousUrl] = useState(url);
  const debounced = useDebouncedValue(draft, PRICE_COMMIT_DELAY_MS);
  const commit = useEffectEvent(onCommit);

  // URL mudou por fora: o rascunho acompanha (ajuste durante o render, sem efeito extra).
  if (url.min !== previousUrl.min || url.max !== previousUrl.max) {
    setPreviousUrl(url);
    if (url.min !== draft.min || url.max !== draft.max) setDraft(url);
  }

  useEffect(() => {
    const settled = debounced.min === draft.min && debounced.max === draft.max;
    const changed = debounced.min !== url.min || debounced.max !== url.max;
    if (settled && changed) commit(debounced);
  }, [debounced, draft, url.min, url.max]);

  return {
    draft,
    move: (thumb, value) => setDraft((current) => movePriceThumb(current, thumb, value)),
  };
};

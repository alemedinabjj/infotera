"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { movePriceThumb, type PriceDraft, type PriceThumb } from "../model/price-range";

/** Atraso entre o último movimento do slider e a gravação na URL. */
export const PRICE_COMMIT_DELAY_MS = 400;

type UsePriceDraft = {
  draft: PriceDraft;
  move: (thumb: PriceThumb, value: number) => void;
};

/**
 * Estado local dos dois sliders: o valor muda na hora (resumo e `aria-valuetext`), a URL só 400 ms
 * depois do último movimento. O commit é agendado no próprio movimento (timer numa ref) e é
 * cancelado quando outro movimento chega, no unmount e quando a URL muda por fora (preço ou
 * `resetKey`, a chave dos demais filtros): "Limpar filtros" durante o debounce nunca regrava o
 * preço antigo, e o rascunho volta a acompanhar a URL.
 */
export const usePriceDraft = (
  url: PriceDraft,
  resetKey: string,
  onCommit: (draft: PriceDraft) => void,
): UsePriceDraft => {
  const [draft, setDraft] = useState(url);
  const [previous, setPrevious] = useState({ min: url.min, max: url.max, resetKey });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ url, onCommit });

  const cancel = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // URL mudou por fora: o rascunho acompanha (ajuste durante o render, sem efeito extra).
  if (url.min !== previous.min || url.max !== previous.max || resetKey !== previous.resetKey) {
    setPrevious({ min: url.min, max: url.max, resetKey });
    if (url.min !== draft.min || url.max !== draft.max) setDraft(url);
  }

  useEffect(() => {
    latest.current = { url, onCommit };
  });

  // Mudança externa (e o unmount) descarta o commit que ainda esperava o debounce.
  // biome-ignore lint/correctness/useExhaustiveDependencies: as chaves só disparam o cancelamento
  useEffect(() => cancel, [url.min, url.max, resetKey, cancel]);

  const move = (thumb: PriceThumb, value: number) => {
    const next = movePriceThumb(draft, thumb, value);
    setDraft(next);
    cancel();
    timer.current = setTimeout(() => {
      timer.current = null;
      const current = latest.current;
      if (next.min !== current.url.min || next.max !== current.url.max) current.onCommit(next);
    }, PRICE_COMMIT_DELAY_MS);
  };

  return { draft, move };
};

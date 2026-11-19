"use client";

import { defaultRangeExtractor, useWindowVirtualizer } from "@tanstack/react-virtual";
import { type RefObject, useCallback } from "react";
import { revealBelowHeader } from "@/shared/lib/scroll";
import { withPinnedIndex } from "../model/feed";
import { useFeedGeometry } from "./useFeedGeometry";
import { useFocusedIndex } from "./useFocusedIndex";
import { useMediaQuery } from "./useMediaQuery";

/** Altura estimada do card antes de medir: empilhado (< sm) e foto ao lado (≥ sm). */
const ESTIMATE = { stacked: 520, row: 240 } as const;
const MAX_FOCUS_ATTEMPTS = 10;

type Options = {
  feedRef: RefObject<HTMLElement | null>;
  /** Chave estável de cada item (id do hotel). */
  keys: readonly number[];
};

/**
 * Virtualização do feed na rolagem da janela (a página já rola na janela: nada de scroll aninhado).
 * Alturas medidas, `gap` igual ao da lista, `scrollMargin`/`scrollPaddingStart` medidos e o card
 * com foco sempre montado (`withPinnedIndex`). `focusIndex` rola até o card, espera ele montar e
 * foca sem rolar de novo.
 */
export const useFeedVirtualizer = ({ feedRef, keys }: Options) => {
  const wide = useMediaQuery("(min-width: 40rem)");
  const roomy = useMediaQuery("(min-width: 64rem)");
  const { scrollMargin, scrollPaddingStart } = useFeedGeometry(feedRef);
  const focused = useFocusedIndex(feedRef);

  const count = keys.length;
  const rangeExtractor = useCallback(
    (range: Parameters<typeof defaultRangeExtractor>[0]) =>
      withPinnedIndex(
        defaultRangeExtractor(range),
        focused !== null && focused < count ? focused : null,
      ),
    [focused, count],
  );
  const virtualizer = useWindowVirtualizer({
    count,
    estimateSize: () => (wide ? ESTIMATE.row : ESTIMATE.stacked),
    getItemKey: (index) => keys[index] ?? index,
    gap: roomy ? 24 : 16,
    overscan: 2,
    scrollMargin,
    scrollPaddingStart,
    rangeExtractor,
  });

  const focusIndex = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: "auto", behavior: "auto" });
      const focusWhenMounted = (attempt: number) => {
        const card = feedRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
        if (card) {
          card.focus({ preventScroll: true });
          revealBelowHeader(card);
        } else if (attempt < MAX_FOCUS_ATTEMPTS) {
          requestAnimationFrame(() => focusWhenMounted(attempt + 1));
        }
      };
      focusWhenMounted(0);
    },
    [virtualizer, feedRef],
  );

  return { virtualizer, scrollMargin, focusIndex };
};

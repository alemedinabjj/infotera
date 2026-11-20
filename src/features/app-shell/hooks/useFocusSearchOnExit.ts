"use client";

import { type RefObject, useLayoutEffect } from "react";
import { revealBelowHeader } from "@/shared/lib/scroll";

/** O botão de envio mais próximo **antes** do marcador (o cartão é o último bloco do `main`). */
const submitBefore = (marker: Element): HTMLElement | undefined =>
  Array.from(document.querySelectorAll<HTMLElement>("main button[type='submit']"))
    .filter((button) => button.compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING)
    .at(-1);

/**
 * Quando o cartão sai da tela (dispensar, aceitar, recusar, `appinstalled`), o foco que estava nele
 * cairia no `body`: vai para o botão de envio da busca ("Buscar hotéis"), que vem logo antes. O
 * efeito de layout roda antes de o React remover o nó, então ainda dá para ler onde estava o foco.
 * `marker` é a região de aviso (fixa, antes do cartão), que serve de ponto de referência no DOM.
 */
export const useFocusSearchOnExit = (
  cardRef: RefObject<HTMLElement | null>,
  marker: RefObject<Element | null>,
): void => {
  useLayoutEffect(() => {
    const card = cardRef.current;
    const reference = marker.current;
    return () => {
      const active = document.activeElement;
      if (!card || !reference) return;
      if (active !== document.body && !card.contains(active)) return;
      const target = submitBefore(reference);
      target?.focus({ preventScroll: true });
      revealBelowHeader(target ?? null);
    };
  }, [cardRef, marker]);
};

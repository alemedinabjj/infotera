"use client";

import { type RefObject, useEffect, useEffectEvent } from "react";
import { feedKeyTarget } from "../model/feed";
import { cardIndexOf } from "./useFocusedIndex";
import { focusResultsHeading } from "./useFocusOnPageChange";

type Options = {
  /** Contêiner do feed E do rodapé: o teclado vale também com o foco no rodapé. */
  containerRef: RefObject<HTMLElement | null>;
  count: number;
  focusIndex: (index: number) => void;
  /** Título (h2) da contagem: destino de `Ctrl+Home`. */
  headingId: string;
  /** Rodapé (botão ou texto final): destino de `Ctrl+End`. */
  footerTargets: ReadonlyArray<RefObject<HTMLElement | null>>;
};

/**
 * Teclado do padrão ARIA `feed`: `PageDown`/`PageUp` entre cards, `Ctrl+End` para o rodapé e
 * `Ctrl+Home` para o título. Ligado num contêiner que envolve o feed e o rodapé (delegação): os
 * cards não são controles (o foco programático, `tabIndex=-1`, é que os alcança) e `Ctrl+Home`
 * precisa funcionar também a partir do rodapé.
 */
export const useFeedKeyboard = ({
  containerRef,
  count,
  focusIndex,
  headingId,
  footerTargets,
}: Options): void => {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const card = cardIndexOf(event.target);
    // Fora dos cards (rodapé) só valem os atalhos com Ctrl; PageUp/PageDown ficam com o navegador.
    if (card === null && !event.ctrlKey) return;
    const current = card ?? count;
    const target = feedKeyTarget({ key: event.key, ctrlKey: event.ctrlKey, current, count });
    if (target === null) return;
    event.preventDefault();
    if (target.kind === "item") focusIndex(target.index);
    else if (target.kind === "before") focusResultsHeading(document.getElementById(headingId));
    else
      footerTargets
        .map((ref) => ref.current)
        .find((node) => node !== null)
        ?.focus();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [containerRef]);
};

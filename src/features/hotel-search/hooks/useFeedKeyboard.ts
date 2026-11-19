"use client";

import { type RefObject, useEffect, useEffectEvent } from "react";
import { feedKeyTarget } from "../model/feed";
import { cardIndexOf } from "./useFocusedIndex";
import { focusResultsHeading } from "./useFocusOnPageChange";

type Options = {
  feedRef: RefObject<HTMLElement | null>;
  count: number;
  focusIndex: (index: number) => void;
  /** Título (h2) da contagem: destino de `Ctrl+Home`. */
  headingId: string;
  /** Rodapé (botão ou texto final): destino de `Ctrl+End`. */
  footerTargets: ReadonlyArray<RefObject<HTMLElement | null>>;
};

/**
 * Teclado do padrão ARIA `feed`: `PageDown`/`PageUp` entre cards, `Ctrl+End` para o rodapé e
 * `Ctrl+Home` para o título. Ligado no próprio feed (delegação): os cards não são controles, o
 * foco programático (`tabIndex=-1`) é que os alcança.
 */
export const useFeedKeyboard = ({
  feedRef,
  count,
  focusIndex,
  headingId,
  footerTargets,
}: Options): void => {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const current = cardIndexOf(event.target);
    if (current === null) return;
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
    const feed = feedRef.current;
    if (!feed) return;
    feed.addEventListener("keydown", onKeyDown);
    return () => feed.removeEventListener("keydown", onKeyDown);
  }, [feedRef]);
};

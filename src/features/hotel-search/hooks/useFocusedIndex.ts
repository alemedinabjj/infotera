"use client";

import { type RefObject, useEffect, useState } from "react";

/** Índice do card (`data-index`) que contém o elemento, ou `null`. */
export const cardIndexOf = (element: EventTarget | null): number | null => {
  if (!(element instanceof Element)) return null;
  const raw = element.closest<HTMLElement>("[data-index]")?.dataset.index;
  const index = raw === undefined ? Number.NaN : Number(raw);
  return Number.isInteger(index) ? index : null;
};

/** Qual card do feed tem o foco agora (ele não pode ser desmontado pela virtualização). */
export const useFocusedIndex = (feedRef: RefObject<HTMLElement | null>): number | null => {
  const [focused, setFocused] = useState<number | null>(null);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const onFocusIn = (event: FocusEvent) => setFocused(cardIndexOf(event.target));
    const onFocusOut = (event: FocusEvent) => {
      // Foco indo para outro lugar do mesmo card (ex.: o link) não solta o card.
      if (cardIndexOf(event.relatedTarget) === null) setFocused(null);
    };
    feed.addEventListener("focusin", onFocusIn);
    feed.addEventListener("focusout", onFocusOut);
    return () => {
      feed.removeEventListener("focusin", onFocusIn);
      feed.removeEventListener("focusout", onFocusOut);
    };
  }, [feedRef]);

  return focused;
};

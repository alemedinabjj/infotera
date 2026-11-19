"use client";

import { type RefObject, useEffect } from "react";
import { consumeFocusAfterNavigation } from "@/shared/lib/focus-after-navigation";
import { revealBelowHeader } from "@/shared/lib/scroll";

/**
 * Depois de "Alterar busca" a página é remontada com outra `key`; o foco volta para o h1 (sem
 * rolar, e fora de trás do header fixo). O formulário marca o destino do envio válido com
 * `markFocusAfterNavigation` (`shared/lib/focus-after-navigation`); carga normal e Voltar não
 * mexem no foco.
 */
export const useFocusAfterEdit = (headingRef: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    if (!consumeFocusAfterNavigation()) return;
    const heading = headingRef.current;
    heading?.focus({ preventScroll: true });
    revealBelowHeader(heading);
  }, [headingRef]);
};

"use client";

import { type RefObject, useEffect } from "react";
import { revealBelowHeader } from "@/shared/lib/scroll";

/** Janela em que um envio do painel "Alterar busca" ainda conta como a causa da remontagem. */
const SUBMIT_WINDOW_MS = 10_000;

let lastEditSubmit = 0;

/** Chamar no envio do formulário do painel: a próxima montagem do cabeçalho leva o foco ao h1. */
export const markEditSubmitted = (): void => {
  lastEditSubmit = Date.now();
};

/**
 * Depois de "Alterar busca" a página é remontada com outra `key`; o foco volta para o h1 (sem
 * rolar, e fora de trás do header fixo). Carga normal e Voltar não mexem no foco.
 */
export const useFocusAfterEdit = (headingRef: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    if (Date.now() - lastEditSubmit > SUBMIT_WINDOW_MS) return;
    lastEditSubmit = 0;
    const heading = headingRef.current;
    heading?.focus({ preventScroll: true });
    revealBelowHeader(heading);
  }, [headingRef]);
};

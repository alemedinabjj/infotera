"use client";

import { type RefObject, useEffect } from "react";
import { revealBelowHeader } from "@/shared/lib/scroll";

/** Envio do painel "Alterar busca" que ainda espera a página remontar com a busca nova. */
let pendingEdit: { from: string } | null = null;

const forgetEdit = (): void => {
  pendingEdit = null;
};

/**
 * Chamar no envio do formulário do painel: a próxima montagem do cabeçalho, numa URL diferente,
 * leva o foco ao h1. O sinal guarda a URL de origem (envio sem mudança não remonta e não conta) e
 * morre no Voltar/Avançar (`popstate`), então nunca depende de um prazo.
 */
export const markEditSubmitted = (): void => {
  pendingEdit = { from: window.location.search };
  window.addEventListener("popstate", forgetEdit, { once: true });
};

/**
 * Depois de "Alterar busca" a página é remontada com outra `key`; o foco volta para o h1 (sem
 * rolar, e fora de trás do header fixo). Carga normal e Voltar não mexem no foco.
 */
export const useFocusAfterEdit = (headingRef: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const edit = pendingEdit;
    pendingEdit = null;
    if (edit === null || edit.from === window.location.search) return;
    const heading = headingRef.current;
    heading?.focus({ preventScroll: true });
    revealBelowHeader(heading);
  }, [headingRef]);
};

"use client";

import { type RefObject, useEffect, useRef } from "react";
import { revealBelowHeader } from "@/shared/lib/scroll";

type Options = {
  /** Título da contagem (`tabIndex={-1}`). */
  headingRef: RefObject<HTMLElement | null>;
  page: number;
  /** O dado da página nova já chegou (não é placeholder nem loading). */
  ready: boolean;
  /** A página mudou sozinha (fora do intervalo): não é navegação da pessoa, não move o foco. */
  silent: boolean;
};

/** Foca o título sem rolar e só rola se ele ficou atrás do header fixo. */
export const focusResultsHeading = (heading: HTMLElement | null): void => {
  if (!heading) return;
  heading.focus({ preventScroll: true });
  revealBelowHeader(heading);
};

/**
 * Quando a página muda por navegação (link da paginação, Voltar), espera o dado novo chegar e leva
 * o foco ao título da contagem, sem deixá-lo atrás do header fixo.
 */
export const useFocusOnPageChange = ({ headingRef, page, ready, silent }: Options): void => {
  const lastPage = useRef(page);
  const lastSilent = useRef(silent);
  const pending = useRef(false);

  useEffect(() => {
    if (page !== lastPage.current) {
      lastPage.current = page;
      pending.current = !lastSilent.current;
    }
    lastSilent.current = silent;
    if (pending.current && ready) {
      pending.current = false;
      focusResultsHeading(headingRef.current);
    }
  }, [page, ready, silent, headingRef]);
};

"use client";

import { type RefObject, useEffect, useRef } from "react";
import { revealBelowHeader } from "@/shared/lib/scroll";

type Options = {
  /** Título da contagem (`tabIndex={-1}`). */
  headingRef: RefObject<HTMLElement | null>;
  page: number;
  /** Serialização dos demais filtros (sem a página): se mudou, a página caiu por causa de um filtro. */
  filtersKey: string;
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
export const useFocusOnPageChange = ({
  headingRef,
  page,
  filtersKey,
  ready,
  silent,
}: Options): void => {
  const lastPage = useRef(page);
  const lastFiltersKey = useRef(filtersKey);
  const lastSilent = useRef(silent);
  const pending = useRef(false);

  useEffect(() => {
    // Mudar filtro/ordenação/preço volta à página 1, mas o foco fica no controle usado; só a
    // navegação (link da paginação, Voltar/Avançar) com os mesmos filtros leva ao título.
    const filtersChanged = filtersKey !== lastFiltersKey.current;
    lastFiltersKey.current = filtersKey;
    if (filtersChanged) pending.current = false;
    if (page !== lastPage.current) {
      lastPage.current = page;
      pending.current = !lastSilent.current && !filtersChanged;
    }
    lastSilent.current = silent;
    if (pending.current && ready) {
      pending.current = false;
      focusResultsHeading(headingRef.current);
    }
  }, [page, filtersKey, ready, silent, headingRef]);
};

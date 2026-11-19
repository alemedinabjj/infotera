"use client";

import { type RefObject, useCallback, useEffect, useRef } from "react";
import { focusResultsHeading } from "./useFocusOnPageChange";

type Options = {
  headingRef: RefObject<HTMLElement | null>;
  /** A lista nova já chegou. */
  ready: boolean;
  /** A nova tentativa terminou e falhou de novo (o botão volta a ficar disponível). */
  failed: boolean;
};

/**
 * O "Tentar de novo" some quando a lista chega; sem isso o foco cairia no `body`. Devolve
 * `markRetried` (chamar no clique): quando o dado chega, o foco vai ao título da contagem; se a
 * tentativa falhar de novo, o botão segue com o foco e nada é movido.
 */
export const useFocusAfterRetry = ({ headingRef, ready, failed }: Options): (() => void) => {
  const retried = useRef(false);

  useEffect(() => {
    if (!retried.current) return;
    if (ready) focusResultsHeading(headingRef.current);
    if (ready || failed) retried.current = false;
  }, [ready, failed, headingRef]);

  return useCallback(() => {
    retried.current = true;
  }, []);
};

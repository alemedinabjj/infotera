"use client";

import { type RefObject, useCallback, useRef, useState } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

type Options = {
  destination: string;
  page: number;
  /** Serialização dos filtros sem a página: muda quando a lista muda por filtro/ordenação. */
  filtersKey: string;
};

type UseKeepResultsHeight = {
  /** Vai no elemento da coluna de resultados. */
  ref: RefObject<HTMLElement | null>;
  /** `min-height` a aplicar (px) enquanto a troca por filtro não terminou de assentar. */
  minHeight: number | undefined;
  /** Chamar antes de aplicar uma mudança de filtro/ordenação: guarda a altura atual. */
  hold: () => void;
};

const isDesktop = (): boolean =>
  typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches;

/**
 * Na sidebar (≥ `lg`) o controle usado fica parado sob o cursor: com a página rolada até o fim,
 * uma lista mais curta encolheria o documento e o controle "pularia". Guardamos a altura da
 * coluna de resultados antes de filtrar e a usamos como `min-height`; ela é liberada quando a
 * pessoa navega (paginação, Voltar) ou faz outra busca. No celular (sheet) não há controle a
 * segurar, então nada é guardado.
 */
export const useKeepResultsHeight = ({
  destination,
  page,
  filtersKey,
}: Options): UseKeepResultsHeight => {
  const ref = useRef<HTMLElement>(null);
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);
  const [previous, setPrevious] = useState({ destination, page, filtersKey });

  if (
    previous.destination !== destination ||
    previous.page !== page ||
    previous.filtersKey !== filtersKey
  ) {
    setPrevious({ destination, page, filtersKey });
    const changedByFilter =
      previous.destination === destination && previous.filtersKey !== filtersKey;
    if (!changedByFilter) setMinHeight(undefined);
  }

  const hold = useCallback(() => {
    const element = ref.current;
    if (element && isDesktop()) setMinHeight(element.offsetHeight);
  }, []);

  return { ref, minHeight, hold };
};

"use client";

import { type RefObject, useEffect, useRef } from "react";

type Options = {
  /** Hotéis carregados (todos os lotes). */
  loaded: number;
  /** Botão "Carregar mais hotéis" / "Tentar de novo". */
  buttonRef: RefObject<HTMLElement | null>;
  /** Consulta atual (filtros + ordenação): mudou, o pedido de foco anterior não vale mais. */
  queryKey: string;
  /** O último lote falhou. */
  failed: boolean;
  /** Pede o próximo lote. */
  loadMore: () => void;
  /** Leva o foco ao card `index` (monta o card se estiver fora da janela virtual). */
  focusIndex: (index: number) => void;
};

/**
 * Quando um lote chega e o foco estava no botão (clique, Enter, ou Tab + carregamento automático),
 * o foco vai para o primeiro card novo: o botão some ou sobe, e o foco não pode cair no `body`.
 * Lote que chega por rolagem (foco fora do botão) não mexe no foco. A decisão é tomada ao PEDIR o
 * lote (devolvido como `loadMore`): com cache o lote chega antes de qualquer render intermediário,
 * e no último lote o botão sai do DOM no mesmo render em que os cards entram. O pedido vale só
 * para o crescimento vindo de `loadMore`: erro no lote ou troca de filtro o cancelam (senão a
 * lista nova, ou um lote tardio, roubaria o foco).
 */
export const useFocusFeedItem = ({
  loaded,
  buttonRef,
  queryKey,
  failed,
  loadMore,
  focusIndex,
}: Options) => {
  const restoreFocus = useRef(false);
  const previousLoaded = useRef(loaded);
  const lastKey = useRef(queryKey);

  useEffect(() => {
    if (failed || lastKey.current !== queryKey) restoreFocus.current = false;
    lastKey.current = queryKey;
  }, [queryKey, failed]);

  useEffect(() => {
    if (loaded > previousLoaded.current && restoreFocus.current) {
      restoreFocus.current = false;
      focusIndex(previousLoaded.current);
    }
    previousLoaded.current = loaded;
  }, [loaded, focusIndex]);

  return () => {
    const button = buttonRef.current;
    restoreFocus.current = button !== null && document.activeElement === button;
    loadMore();
  };
};

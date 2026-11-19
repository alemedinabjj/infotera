"use client";

import { type RefObject, useEffect, useRef } from "react";

type Options = {
  /** Hotéis carregados (todos os lotes). */
  loaded: number;
  /** Botão "Carregar mais hotéis" / "Tentar de novo". */
  buttonRef: RefObject<HTMLElement | null>;
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
 * e no último lote o botão sai do DOM no mesmo render em que os cards entram.
 */
export const useFocusFeedItem = ({ loaded, buttonRef, loadMore, focusIndex }: Options) => {
  const restoreFocus = useRef(false);
  const previousLoaded = useRef(loaded);

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

"use client";

import { type RefObject, useEffect, useEffectEvent } from "react";

type Options = {
  /** Elemento no fim do feed (o rodapé). */
  sentinelRef: RefObject<HTMLElement | null>;
  /** Há próximo lote, nenhum fetch em andamento e nenhum erro no último lote. */
  enabled: boolean;
  onLoadMore: () => void;
};

/** Distância antes do fim em que o próximo lote já é pedido. */
const ROOT_MARGIN = "0px 0px 600px 0px";

/**
 * Pede o próximo lote quando o rodapé chega perto da janela. Desligado com fetch em andamento ou
 * erro no último lote (o erro nunca re-dispara sozinho: sem laço de falhas; só o botão tenta de
 * novo). Sem `IntersectionObserver` o botão "Carregar mais hotéis" continua sendo o caminho.
 */
export const useAutoLoadMore = ({ sentinelRef, enabled, onLoadMore }: Options): void => {
  const loadMore = useEffectEvent(onLoadMore);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!enabled || !sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, sentinelRef]);
};

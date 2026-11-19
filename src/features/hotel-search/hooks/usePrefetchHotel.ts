"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type FocusEventHandler, type PointerEventHandler, useEffect, useRef } from "react";
import { hotelQueryOptions, hotelRoomsQueryOptions } from "@/shared/api/queries";

/** Tempo de "intenção" do mouse antes de prefetchar (passar por cima rápido não dispara). */
export const PREFETCH_INTENT_MS = 150;

type PrefetchHandlers = {
  onPointerEnter: PointerEventHandler<HTMLElement>;
  onPointerLeave: PointerEventHandler<HTMLElement>;
  onFocus: FocusEventHandler<HTMLElement>;
};

/**
 * Handlers para o link do card: mouse que fica 150 ms em cima ou foco por teclado prefetcham o
 * hotel e os quartos com as mesmas query options que a F4/F5 usam (o `staleTime` do client evita
 * repetir). Toque não prefetcha: o `pointerdown` vem colado no clique.
 */
export const usePrefetchHotel = (hotelId: number): PrefetchHandlers => {
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };

  const prefetch = () => {
    void queryClient.prefetchQuery(hotelQueryOptions(hotelId));
    void queryClient.prefetchQuery(hotelRoomsQueryOptions(hotelId));
  };

  // Desmontar (ex.: trocou de página) cancela a intenção pendente.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `cancel` só usa a ref estável
  useEffect(() => cancel, []);

  return {
    onPointerEnter: (event) => {
      if (event.pointerType !== "mouse") return;
      cancel();
      timer.current = setTimeout(prefetch, PREFETCH_INTENT_MS);
    },
    onPointerLeave: cancel,
    onFocus: () => {
      cancel();
      prefetch();
    },
  };
};

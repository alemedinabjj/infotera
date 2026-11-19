"use client";

import { type PointerEvent, useRef } from "react";
import { type GalleryAction, swipeAction } from "../model/gallery";

type Point = { id: number; x: number; y: number };

/**
 * Gesto de arrastar na horizontal (pointer events: toque, caneta e mouse) sobre `swipeAction`.
 * Espalhe o resultado no elemento (que precisa de `touch-action: pan-y`, senão o navegador
 * cancela o gesto para rolar). Sem animação de deslize: a troca é instantânea, então não há o
 * que reduzir com `prefers-reduced-motion`. As setas e o teclado seguem como alternativa.
 */
export const useSwipe = (onAction: (action: GalleryAction) => void) => {
  const start = useRef<Point | null>(null);

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent) => {
    const from = start.current;
    start.current = null;
    if (from === null || from.id !== event.pointerId) return;
    const action = swipeAction(event.clientX - from.x, event.clientY - from.y);
    if (action !== null) onAction(action);
  };

  const onPointerCancel = () => {
    start.current = null;
  };

  return { onPointerDown, onPointerUp, onPointerCancel };
};

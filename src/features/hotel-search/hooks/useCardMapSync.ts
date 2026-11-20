"use client";

import type { FocusEvent } from "react";
import { useIsActiveHotel, useMapSync } from "../store/map-sync";

type CardMapSync = {
  /** Este card é o destacado (hover/foco no card ou no marcador do mapa). */
  active: boolean;
  handlers: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocus: () => void;
    onBlur: (event: FocusEvent<HTMLElement>) => void;
  };
};

/**
 * Liga o card ao destaque do mapa: pointer/foco no card marca o hotel; sair desmarca (mover o foco
 * entre controles do mesmo card não desmarca). `active` vem por seletor: só este card re-renderiza.
 */
export const useCardMapSync = (hotelId: number): CardMapSync => {
  const active = useIsActiveHotel(hotelId);
  const setActive = useMapSync((state) => state.setActive);
  return {
    active,
    handlers: {
      onPointerEnter: () => setActive(hotelId),
      onPointerLeave: () => setActive(null),
      onFocus: () => setActive(hotelId),
      onBlur: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
      },
    },
  };
};

"use client";

import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
import { useMapSync } from "../store/map-sync";

type SkipMapLinkProps = {
  /** Id do painel (destino sem JS) e primeiro hotel da lista (destino do foco). */
  panelId: string;
  firstHotelId: number | undefined;
};

/**
 * "Pular o mapa": primeiro filho do painel, visível só com foco, sobre o canto do mapa (`absolute`,
 * `z-10` dentro do wrapper `isolate`, sem empurrar nada). Leva o foco ao link do primeiro card.
 */
export const SkipMapLink = ({ panelId, firstHotelId }: SkipMapLinkProps) => {
  const label = useHotelSearchMessages().map.skip;
  const revealCard = useMapSync((state) => state.revealCard);
  return (
    <a
      href={`#${panelId}`}
      onClick={(event) => {
        event.preventDefault();
        if (firstHotelId !== undefined) revealCard?.(firstHotelId);
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-control focus:bg-surface focus:px-4 focus:text-sm focus:font-medium focus:text-primary focus:shadow-raised"
    >
      {label}
    </a>
  );
};

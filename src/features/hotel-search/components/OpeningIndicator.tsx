"use client";

import { useLinkStatus } from "next/link";
import { HOTEL_SEARCH_MESSAGES } from "../model/messages";

/**
 * Feedback imediato ao abrir o hotel (a navegação pode levar segundos com a API lenta): selo
 * "Abrindo…" sobre a foto enquanto o `Link` pai está pendente. Deve ficar DENTRO do `Link`.
 */
export const OpeningIndicator = () => {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      role="status"
      className="absolute top-2 left-2 z-10 rounded-control bg-surface/95 px-3 py-1 text-sm font-medium text-fg shadow-card"
    >
      {HOTEL_SEARCH_MESSAGES.opening}
    </span>
  );
};

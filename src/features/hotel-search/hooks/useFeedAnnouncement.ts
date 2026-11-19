"use client";

import { useState } from "react";
import {
  type AnnouncementSnapshot,
  describeFeedAnnouncement,
  nextAnnouncementSnapshot,
} from "../model/feed";
import type { FeedState } from "./results-model";

/**
 * Anúncio do feed para o `aria-live`: `Mais 4 hotéis carregados. Mostrando 14 de 14.` quando o
 * nº de lotes cresce dentro da MESMA consulta (`feed.queryKey`). Vazio fora da rolagem contínua, em
 * troca de filtro e quando não há nada novo (a contagem inicial é anunciada pelo texto geral).
 */
export const useFeedAnnouncement = (feed: FeedState | null, total: number): string => {
  const progress = {
    key: feed?.queryKey ?? "",
    batches: feed?.batches ?? 0,
    loaded: feed?.loaded ?? 0,
  };
  const [snapshot, setSnapshot] = useState<AnnouncementSnapshot>({
    ...progress,
    previousLoaded: progress.loaded,
  });
  // Ajuste de estado derivado de props, no render (padrão do React): sem ref mutada nem efeito.
  const next = nextAnnouncementSnapshot(snapshot, progress);
  if (next !== snapshot) setSnapshot(next);
  if (feed === null) return "";
  return describeFeedAnnouncement({
    previousLoaded: next.previousLoaded,
    loaded: progress.loaded,
    total,
    footer: feed.footer,
  });
};

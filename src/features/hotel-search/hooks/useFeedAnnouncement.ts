"use client";

import { useState } from "react";
import { describeFeedAnnouncement } from "../model/feed";
import type { FeedState } from "./results-model";

type Snapshot = { loaded: number; previousLoaded: number };

/**
 * Anúncio do feed para o `aria-live`: guarda quantos hotéis havia antes do último lote
 * (`Mais 4 hotéis carregados. Mostrando 14 de 14.`). Vazio fora da rolagem contínua e quando não há
 * nada novo (a contagem inicial é anunciada pelo texto geral).
 */
export const useFeedAnnouncement = (feed: FeedState | null, total: number): string => {
  const loaded = feed?.loaded ?? 0;
  const [snapshot, setSnapshot] = useState<Snapshot>({ loaded, previousLoaded: loaded });
  // Ajuste de estado derivado de props, no render (padrão do React): sem ref mutada nem efeito.
  if (snapshot.loaded !== loaded) setSnapshot({ loaded, previousLoaded: snapshot.loaded });
  if (feed === null) return "";
  return describeFeedAnnouncement({
    previousLoaded: snapshot.previousLoaded,
    loaded,
    total,
    footer: feed.footer,
  });
};

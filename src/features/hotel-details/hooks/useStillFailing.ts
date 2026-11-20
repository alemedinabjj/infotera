"use client";

import { useState } from "react";
import { IDLE_RETRY, trackRetry } from "../model/retry-feedback";

/**
 * `true` quando uma tentativa de "Tentar de novo" terminou e o erro continua na tela: alimenta o aviso
 * de `aria-live` (o cartão não muda de texto, então o leitor de tela não perceberia o fracasso).
 * Estado derivado no render (padrão do React para ajustar estado a uma prop), sem efeito.
 */
export const useStillFailing = (retrying: boolean): boolean => {
  const [track, setTrack] = useState(IDLE_RETRY);
  const next = trackRetry(track, retrying);
  if (next !== track) setTrack(next);
  return next.stillFailing;
};

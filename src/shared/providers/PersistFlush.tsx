"use client";

import { useIsRestoring, useQueryClient } from "@tanstack/react-query";
import { persistQueryClientSave } from "@tanstack/react-query-persist-client";
import { useEffect } from "react";
import type { PersistOptions } from "./persist-options";

/**
 * Grava uma vez o que já estava no cache quando a restauração terminou. O `PersistQueryClientProvider`
 * só salva em **eventos** do cache depois que assina; o que o servidor pré-buscou (hotel, quartos,
 * avaliações) entra pelo `HydrationBoundary` antes disso e, sem outro evento, nunca chegava ao storage.
 * O efeito do filho roda antes do efeito de assinatura do provider, no mesmo commit: não sobra janela.
 */
export const PersistFlush = ({ options }: { options: PersistOptions }) => {
  const client = useQueryClient();
  const isRestoring = useIsRestoring();
  useEffect(() => {
    if (isRestoring) return;
    persistQueryClientSave({ ...options, queryClient: client }).catch(() => undefined);
  }, [client, isRestoring, options]);
  return null;
};

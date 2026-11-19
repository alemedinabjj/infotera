"use client";

import { type FetchQueryOptions, type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

type Options = {
  /** Terminou: `true` se o dado chegou (a boundary deve resetar), `false` se falhou de novo. */
  onFinished: (recovered: boolean) => void;
};

/**
 * "Tentar de novo" de uma seção. Busca o dado direto no cache (`fetchQuery`: não depende de haver
 * observadores, e no TanStack v5 uma query sem dados volta a `pending` ao refazer, o que sumiria
 * com o erro) e mantém o botão em "Tentando…" até acabar: o botão não desmonta para dar lugar a um
 * skeleton. Só então avisa o resultado; a boundary reseta apenas no sucesso.
 */
export const useSectionRetry = <TData, TKey extends QueryKey>(
  options: FetchQueryOptions<TData, Error, TData, TKey>,
  { onFinished }: Options,
) => {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  const retry = useCallback(async () => {
    setRetrying(true);
    let recovered = false;
    try {
      await queryClient.fetchQuery({ ...options, staleTime: 0 });
      recovered = true;
    } catch {
      recovered = false;
    }
    setRetrying(false);
    onFinished(recovered);
  }, [queryClient, options, onFinished]);

  return { retry, retrying };
};

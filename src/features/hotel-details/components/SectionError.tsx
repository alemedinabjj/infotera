"use client";

import type { FetchQueryOptions, QueryKey } from "@tanstack/react-query";
import { ErrorState } from "@/shared/ui";
import { useSectionRetry } from "../hooks/useSectionRetry";

type SectionErrorProps<TData, TKey extends QueryKey> = {
  title: string;
  /** Query que falhou: o retry a busca direto, sem desmontar o botão. */
  options: FetchQueryOptions<TData, Error, TData, TKey>;
  onFinished: (recovered: boolean) => void;
};

/** Erro de uma seção (nunca o texto da API) com "Tentar de novo" que mantém o botão no lugar. */
export const SectionError = <TData, TKey extends QueryKey>({
  title,
  options,
  onFinished,
}: SectionErrorProps<TData, TKey>) => {
  const { retry, retrying } = useSectionRetry(options, { onFinished });
  return (
    <ErrorState
      title={title}
      description="Verifique sua conexão e tente de novo."
      headingLevel={3}
      onRetry={() => void retry()}
      retrying={retrying}
    />
  );
};

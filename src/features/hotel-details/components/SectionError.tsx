"use client";

import type { FetchQueryOptions, QueryKey } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { revealBelowHeader } from "@/shared/lib/scroll";
import { ErrorState } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { useSectionRetry } from "../hooks/useSectionRetry";

type SectionErrorProps<TData, TKey extends QueryKey> = {
  title: string;
  /** Query que falhou: o retry a busca direto, sem desmontar o botão. */
  options: FetchQueryOptions<TData, Error, TData, TKey>;
  onFinished: (recovered: boolean) => void;
  /**
   * O erro surgiu de uma ação da pessoa (ex.: trocar de página): leva o foco a "Tentar de novo" ao
   * montar, sem rolar e fora de trás do header fixo. Na carga inicial, deixa o foco em paz.
   */
  focusRetry?: boolean;
};

/** Erro de uma seção (nunca o texto da API) com "Tentar de novo" que mantém o botão no lugar. */
export const SectionError = <TData, TKey extends QueryKey>({
  title,
  options,
  onFinished,
  focusRetry = false,
}: SectionErrorProps<TData, TKey>) => {
  const t = useHotelDetailsMessages().errors;
  const { retry, retrying } = useSectionRetry(options, { onFinished });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusRetry) return;
    const button = ref.current?.querySelector("button");
    button?.focus({ preventScroll: true });
    revealBelowHeader(button ?? null);
  }, [focusRetry]);
  return (
    <div ref={ref}>
      <ErrorState
        title={title}
        description={t.sectionRetry}
        headingLevel={3}
        onRetry={() => void retry()}
        retrying={retrying}
      />
    </div>
  );
};

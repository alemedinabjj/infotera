"use client";

import type { FetchQueryOptions, QueryKey } from "@tanstack/react-query";
import { type ReactNode, Suspense, useEffect, useRef } from "react";
import { ErrorBoundary } from "@/shared/ui";
import { focusHeading } from "../hooks/focus-heading";
import { SectionError } from "./SectionError";

type SectionBoundaryProps<TData, TKey extends QueryKey> = {
  /** `id` do h2 da seção: recebe o foco quando o retry traz o conteúdo de volta. */
  headingId: string;
  errorTitle: string;
  /** Query da seção (a mesma que o conteúdo lê com `useSuspenseQuery`). */
  options: FetchQueryOptions<TData, Error, TData, TKey>;
  /** Skeleton enquanto o conteúdo suspende. */
  loading: ReactNode;
  children: ReactNode;
};

/** Monta junto com o conteúdo (dentro do Suspense) e avisa que ele já está na tela. */
const ContentShown = ({ onShown }: { onShown: () => void }) => {
  useEffect(onShown, [onShown]);
  return null;
};

/**
 * Erro + loading de uma seção. O h2 fica fora (sempre no HTML). Falha: `SectionError` com retry
 * que mantém o botão; sucesso do retry: a boundary reseta, o conteúdo entra e o foco vai ao h2.
 */
export const SectionBoundary = <TData, TKey extends QueryKey>({
  headingId,
  errorTitle,
  options,
  loading,
  children,
}: SectionBoundaryProps<TData, TKey>) => {
  const recoveredByRetry = useRef(false);

  const onShown = () => {
    if (!recoveredByRetry.current) return;
    recoveredByRetry.current = false;
    focusHeading(headingId);
  };

  return (
    <ErrorBoundary
      fallback={({ reset }) => (
        <SectionError
          title={errorTitle}
          options={options}
          onFinished={(recovered) => {
            if (!recovered) return;
            recoveredByRetry.current = true;
            reset();
          }}
        />
      )}
    >
      <Suspense fallback={loading}>
        {children}
        <ContentShown onShown={onShown} />
      </Suspense>
    </ErrorBoundary>
  );
};

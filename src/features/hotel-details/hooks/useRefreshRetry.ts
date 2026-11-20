"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { findHeading, focusHeadingElement } from "./focus-heading";

/**
 * "Tentar de novo" de uma seção que falhou **no servidor** (quartos, comentários): refaz a página com
 * `router.refresh()` dentro de uma transition (`retrying` fica `true` até a resposta chegar, o botão
 * não some). Quando o retry traz o conteúdo, este componente desmonta e o foco vai ao h2 da seção; se
 * falhar de novo, o botão continua no mesmo lugar.
 */
export const useRefreshRetry = (headingId: string) => {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  // O h2 é guardado no clique: o cleanup também roda quando o Activity esconde a rota, e um `getElementById`
  // ali poderia achar o h2 (mesmo id) de outro hotel.
  const heading = useRef<HTMLElement | null>(null);
  /** Âncora no DOM da seção: o h2 certo é o da `<section>` que contém o erro. */
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      const target = heading.current;
      heading.current = null;
      focusHeadingElement(target);
    },
    [],
  );

  const retry = () => {
    heading.current = findHeading(headingId, anchorRef.current);
    startTransition(() => router.refresh());
  };

  return { retry, retrying, anchorRef };
};

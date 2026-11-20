"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { focusHeading } from "./focus-heading";

/**
 * "Tentar de novo" de uma seção que falhou **no servidor** (quartos, comentários): refaz a página com
 * `router.refresh()` dentro de uma transition (`retrying` fica `true` até a resposta chegar, o botão
 * não some). Quando o retry traz o conteúdo, este componente desmonta e o foco vai ao h2 da seção; se
 * falhar de novo, o botão continua no mesmo lugar.
 */
export const useRefreshRetry = (headingId: string) => {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  const retried = useRef(false);

  useEffect(
    () => () => {
      if (retried.current) focusHeading(headingId);
    },
    [headingId],
  );

  const retry = () => {
    retried.current = true;
    startTransition(() => router.refresh());
  };

  return { retry, retrying };
};

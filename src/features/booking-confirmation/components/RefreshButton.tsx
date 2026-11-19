"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { revealBelowHeader } from "@/shared/lib/scroll";
import { Button } from "@/shared/ui";
import { STAY_TITLE_ID } from "./stay-ids";

/**
 * "Tentar de novo" da seção hotel/quarto (Server Component sem `onRetry`): `router.refresh()`
 * dentro de `startTransition` refaz a página no servidor, com o botão em "Tentando…" e o foco nele.
 * Se o retry der certo o botão sai da tela e o foco vai para o `h2` "Sua estadia"; se falhar, o
 * mesmo botão continua montado (e focado).
 */
export const RefreshButton = () => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const started = useRef(false);

  useEffect(
    () => () => {
      if (!started.current) return;
      const title = document.getElementById(STAY_TITLE_ID);
      title?.focus({ preventScroll: true });
      revealBelowHeader(title);
    },
    [],
  );

  const handleClick = () => {
    started.current = true;
    startTransition(() => router.refresh());
  };

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      loading={pending}
      loadingText="Tentando…"
      className="print:hidden"
    >
      Tentar de novo
    </Button>
  );
};

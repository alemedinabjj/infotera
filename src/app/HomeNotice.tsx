"use client";

import { useSearchParams } from "next/navigation";
import { CHOOSE_ROOM_NOTICE, HOME_NOTICE_PARAM } from "@/shared/lib/links";
import { Alert } from "@/shared/ui";

/**
 * Aviso do redirecionamento do checkout sem quarto (`?notice=choose-room`). Lido no cliente (dentro
 * de `<Suspense>` na página) para a rota `/` continuar estática.
 */
export const HomeNotice = () => {
  const notice = useSearchParams().get(HOME_NOTICE_PARAM);
  return notice === CHOOSE_ROOM_NOTICE ? (
    <Alert tone="info">Escolha um quarto para continuar.</Alert>
  ) : null;
};

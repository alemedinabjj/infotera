"use client";

import { useSearchParams } from "next/navigation";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { CHOOSE_ROOM_NOTICE, HOME_NOTICE_PARAM } from "@/shared/lib/links";
import { Alert } from "@/shared/ui";

/**
 * Aviso do redirecionamento do checkout sem quarto (`?notice=choose-room`). Lido no cliente (dentro
 * de `<Suspense>` na página) para a rota `/` continuar estática.
 */
export const HomeNotice = () => {
  const t = useCommonMessages().routes.home;
  const notice = useSearchParams().get(HOME_NOTICE_PARAM);
  return notice === CHOOSE_ROOM_NOTICE ? <Alert tone="info">{t.chooseRoom}</Alert> : null;
};

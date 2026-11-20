"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { useLocale } from "@/shared/i18n/client";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, ErrorState, FocusOnMount } from "@/shared/ui";

type ConfirmationErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/**
 * Falha ao ler a reserva (5xx, rede, timeout): "Tentar de novo" refaz o fetch no servidor. Só
 * importa `@/shared/ui`: o `index.ts` da feature levaria código de servidor para o cliente. O log
 * leva só o `digest`: nem o id da reserva nem a mensagem do erro.
 */
const ConfirmationError = ({ error, retry }: ConfirmationErrorProps) => {
  const t = useCommonMessages().routes;
  const locale = useLocale();
  const [retrying, startTransition] = useTransition();
  useEffect(() => {
    console.error({ event: "confirmation:route-error", digest: error.digest ?? null });
  }, [error.digest]);

  return (
    <div className="w-full max-w-3xl">
      <ErrorState
        variant="page"
        headingLevel={1}
        title={t.confirmationError.title}
        description={t.confirmationError.description}
        onRetry={() => startTransition(() => retry())}
        retrying={retrying}
        action={
          <Link href={localizePath(locale, "/")} className={buttonClassName({ variant: "ghost" })}>
            {t.newSearch}
          </Link>
        }
      />
      <FocusOnMount selector="h1" />
    </div>
  );
};

export default ConfirmationError;

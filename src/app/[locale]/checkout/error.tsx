"use client";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/client";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, ErrorState } from "@/shared/ui";

/** Erro inesperado ao abrir o checkout. Só importa `@/shared/ui`. */
const CheckoutError = ({ retry }: { error: unknown; retry: () => void }) => {
  const t = useCommonMessages().routes;
  const locale = useLocale();
  return (
    <ErrorState
      variant="page"
      headingLevel={1}
      title={t.checkoutError.title}
      description={t.checkoutError.description}
      onRetry={retry}
      action={
        <Link href={localizePath(locale, "/")} className={buttonClassName({ variant: "ghost" })}>
          {t.newSearch}
        </Link>
      }
    />
  );
};

export default CheckoutError;

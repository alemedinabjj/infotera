"use client";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/client";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, ErrorState } from "@/shared/ui";

type SearchErrorProps = { error: unknown; retry: () => void };

/** Erro inesperado da rota (a lista tem a própria boundary e não chega aqui). */
const SearchError = ({ retry }: SearchErrorProps) => {
  const t = useCommonMessages().routes;
  const locale = useLocale();
  return (
    <ErrorState
      variant="page"
      headingLevel={1}
      title={t.searchError}
      description={t.tryOrSearch}
      onRetry={retry}
      action={
        <Link href={localizePath(locale, "/")} className={buttonClassName({ variant: "ghost" })}>
          {t.newSearch}
        </Link>
      }
    />
  );
};

export default SearchError;

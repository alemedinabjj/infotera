"use client";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/client";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName } from "@/shared/ui/atoms/button-styles";
import { EmptyState } from "@/shared/ui/molecules/EmptyState";

/** 404 do idioma (`[...rest]` e `notFound()`): título e textos pelo dicionário. */
const NotFound = () => {
  const t = useCommonMessages().routes;
  const locale = useLocale();
  return (
    <>
      <title>{t.notFound.metaTitle}</title>
      <EmptyState
        headingLevel={1}
        title={t.notFound.title}
        description={t.notFound.description}
        action={
          <Link
            href={localizePath(locale, "/")}
            className={buttonClassName({ variant: "primary" })}
          >
            {t.backToSearch}
          </Link>
        }
      />
    </>
  );
};

export default NotFound;

"use client";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/client";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, EmptyState } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";

/** Hotel inexistente ou id inválido: ocupa a página (h1) e leva a uma nova busca. */
export const HotelNotFound = () => {
  const t = useHotelDetailsMessages().notFound;
  const newSearch = useCommonMessages().routes.newSearch;
  const locale = useLocale();
  return (
    <EmptyState
      headingLevel={1}
      title={t.title}
      description={t.description}
      action={
        <Link href={localizePath(locale, "/")} className={buttonClassName()}>
          {newSearch}
        </Link>
      }
    />
  );
};

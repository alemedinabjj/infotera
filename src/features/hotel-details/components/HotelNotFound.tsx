import Link from "next/link";
import { commonMessages } from "@/shared/i18n/common/messages";
import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, EmptyState } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";

/** Hotel inexistente ou id inválido: ocupa a página (h1) e leva a uma nova busca. */
export const HotelNotFound = ({ locale }: { locale: Locale }) => {
  const t = hotelDetailsMessages.get(locale).notFound;
  const newSearch = commonMessages.get(locale).routes.newSearch;
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

import Link from "next/link";
import { commonMessages } from "@/shared/i18n/common/messages";
import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName } from "@/shared/ui/atoms/button-styles";
import { EmptyState } from "@/shared/ui/molecules/EmptyState";

/** "Página não encontrada" do idioma: h1, texto e link para a busca. Sem `<title>` (cada chamador põe o seu). */
export const RouteNotFound = ({ locale }: { locale: Locale }) => {
  const t = commonMessages.get(locale).routes;
  return (
    <EmptyState
      headingLevel={1}
      title={t.notFound.title}
      description={t.notFound.description}
      action={
        <Link href={localizePath(locale, "/")} className={buttonClassName({ variant: "primary" })}>
          {t.backToSearch}
        </Link>
      }
    />
  );
};

import Link from "next/link";
import { commonMessages } from "@/shared/i18n/common/messages";
import { localizePath } from "@/shared/i18n/paths";
import { getLocale } from "@/shared/i18n/server";
import { buttonClassName } from "@/shared/ui/atoms/button-styles";
import { EmptyState } from "@/shared/ui/molecules/EmptyState";

/** 404 do idioma (`[...rest]` e `notFound()`): título e textos pelo dicionário. */
const NotFound = async () => {
  const locale = await getLocale();
  const t = commonMessages.get(locale).routes;
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

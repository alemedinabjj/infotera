import { commonMessages } from "@/shared/i18n/common/messages";
import { getLocale } from "@/shared/i18n/server";
import { RouteNotFound } from "./RouteNotFound";

/** 404 do idioma (`notFound()` de rotas sem "não encontrado" próprio): título e textos pelo dicionário. */
const NotFound = async () => {
  const locale = await getLocale();
  return (
    <>
      <title>{commonMessages.get(locale).routes.notFound.metaTitle}</title>
      <RouteNotFound locale={locale} />
    </>
  );
};

export default NotFound;

import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { BRAND_NAME } from "@/shared/lib/brand";
import { checkoutMessages } from "../i18n/messages";

/** Título da aba da página (metadata do servidor). */
export const checkoutPageTitle = (locale: Locale = DEFAULT_LOCALE): string =>
  `${checkoutMessages.get(locale).pageTitle} | ${BRAND_NAME}`;

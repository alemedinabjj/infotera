import type { Locale } from "@/shared/i18n/config";
import { BRAND_NAME } from "@/shared/lib/brand";
import { checkoutMessages } from "../i18n/messages";

/** Título da aba da página (metadata do servidor). */
export const checkoutPageTitle = (locale: Locale): string =>
  `${checkoutMessages.get(locale).pageTitle} | ${BRAND_NAME}`;

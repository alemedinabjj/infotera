import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

/**
 * Locale do segmento `[locale]` a partir de `params` (páginas e `generateMetadata`). O layout já
 * devolve 404 para valor fora de `LOCALES`; aqui um valor inesperado cai no padrão em vez de lançar.
 */
export const localeOf = async (params: Promise<{ locale: string }>): Promise<Locale> => {
  const { locale } = await params;
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
};

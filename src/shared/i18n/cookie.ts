import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./config";

/** Valor de `document.cookie` da escolha explícita de idioma (só o locale, nenhum dado pessoal). */
export const localeCookie = (locale: Locale): string =>
  `${LOCALE_COOKIE}=${locale}; Path=/; SameSite=Lax; Max-Age=${LOCALE_COOKIE_MAX_AGE}`;

/** Grava a escolha de idioma (chamada só pelo seletor do header). */
export const writeLocaleCookie = (locale: Locale): void => {
  // biome-ignore lint/suspicious/noDocumentCookie: tem de ser síncrono (a navegação acontece em seguida; a Cookie Store API é assíncrona).
  document.cookie = localeCookie(locale);
};

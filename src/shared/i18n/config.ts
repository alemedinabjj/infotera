import { z } from "@/shared/lib/zod";

/** Idiomas do produto. pt-BR é a fonte (padrão, URLs sem prefixo); en-US usa o prefixo `/en`. */
export const LOCALES = ["pt-BR", "en-US"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";

/** Cookie com a escolha **explícita** de idioma (seletor do header). Não guarda dado pessoal. */
export const LOCALE_COOKIE = "infotera-locale";

/** Um ano, em segundos. */
export const LOCALE_COOKIE_MAX_AGE = 31_536_000;

/** Prefixo público de cada locale: pt-BR sem prefixo, en-US em `/en`. */
export const LOCALE_PREFIX: Readonly<Record<Locale, string>> = { "pt-BR": "", "en-US": "/en" };

export const localeSchema = z.enum(LOCALES);

/** Guarda de tipo: `true` só para `"pt-BR"` e `"en-US"` (nunca `"en"` nem `"EN-us"`). */
export const isLocale = (value: unknown): value is Locale =>
  LOCALES.some((locale) => locale === value);

/**
 * Atributo `lang` de blocos com texto vindo da API (sempre em português): em páginas pt-BR não é
 * preciso marcar; em en-US o bloco precisa declarar o idioma próprio (WCAG 3.1.2).
 */
export const contentLang = (locale: Locale): "pt-BR" | undefined =>
  locale === "pt-BR" ? undefined : "pt-BR";

import type { Locale } from "./config";

type Messages<M> = { get: (locale: Locale) => M };

/**
 * Registra os dicionários de um escopo (feature ou `common`). `Record<Locale, M>` garante em
 * compilação que os dois idiomas existem e têm exatamente o mesmo formato.
 */
export const defineMessages = <M>(byLocale: Readonly<Record<Locale, M>>): Messages<M> => ({
  get: (locale) => byLocale[locale],
});

type PluralForms = { one: string; other: string };

/**
 * `1` usa `one`; todo o resto (inclusive `0`) usa `other`. Vale para pt-BR e en-US: o produto escreve
 * "0 noites", enquanto `Intl.PluralRules("pt-BR")` classificaria o zero como singular.
 */
export const plural = (count: number, forms: PluralForms): string =>
  count === 1 ? forms.one : forms.other;

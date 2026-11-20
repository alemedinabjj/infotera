import type { Locale } from "../i18n/config";

const formatters = new Map<string, Intl.NumberFormat>();

const currencyFormatter = (locale: Locale, cents: boolean): Intl.NumberFormat => {
  const key = `${locale}:${cents}`;
  const cached = formatters.get(key);
  if (cached) return cached;
  const created = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
    ...(cents ? {} : { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  });
  formatters.set(key, created);
  return created;
};

type FormatBRLOptions = {
  /** `false` omite os centavos (ex.: preço por noite compacto). Padrão: `true`. */
  cents?: boolean;
  /** Idioma da formatação . O valor continua em BRL, sem conversão de câmbio. */
  locale: Locale;
};

/**
 * Formata um valor em reais: `R$ 1.200,00` em pt-BR (espaço não separável) e `R$1,200.00` em en-US.
 */
export const formatBRL = (reais: number, { cents = true, locale }: FormatBRLOptions): string =>
  currencyFormatter(locale, cents).format(reais);

/** Converte reais em centavos inteiros, sem erro de ponto flutuante. */
export const reaisToCents = (reais: number): number => Math.round(reais * 100);

/** Converte centavos inteiros em reais. */
export const centsToReais = (cents: number): number => cents / 100;

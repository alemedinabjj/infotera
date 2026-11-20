import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";

const TIME_ZONE = "America/Sao_Paulo";

const FORMATTERS: Readonly<Record<Locale, Intl.DateTimeFormat>> = {
  "pt-BR": new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }),
  "en-US": new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }),
};

/**
 * pt-BR: `19/11/2026, 12:04`; en-US: `Nov 19, 2026, 12:04 PM`. Sempre no horário de Brasília,
 * qualquer que seja o fuso do processo (o RSC roda em UTC na Vercel). Montado por partes para não
 * depender do separador de data e hora do ICU.
 */
export const formatBookedAt = (iso: string, locale: Locale = DEFAULT_LOCALE): string => {
  const parts = Object.fromEntries(
    FORMATTERS[locale].formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  if (locale === "en-US") {
    return `${parts.month} ${parts.day}, ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
  }
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
};

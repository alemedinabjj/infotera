import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { confirmationMessages } from "../i18n/messages";
import type { BookingLoad } from "./load-result";

/** A página tem PII e é "secreta" pelo link: nunca indexar nem seguir links dela. */
export const CONFIRMATION_ROBOTS = { index: false, follow: false } as const;

/** Título genérico por estado: nunca leva nome, e-mail nem o id da reserva. */
export const confirmationTitle = (load: BookingLoad, locale: Locale = DEFAULT_LOCALE): string => {
  const t = confirmationMessages.get(locale);
  switch (load.kind) {
    case "found":
      return `${t.titles.found} | ${t.site}`;
    case "not-found":
      return `${t.titles.notFound} | ${t.site}`;
    case "unreadable":
      return `${t.titles.unreadable} | ${t.site}`;
    default: {
      const unreachable: never = load;
      return unreachable;
    }
  }
};

/** Título usado quando ler a reserva falha no metadata (o metadata nunca derruba a página). */
export const fallbackConfirmationTitle = (locale: Locale = DEFAULT_LOCALE): string =>
  `${confirmationMessages.get(locale).titles.found} | ${confirmationMessages.get(locale).site}`;

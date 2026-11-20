import type { Locale } from "../i18n/config";

const CLOCK = /^(\d{1,2}):(\d{2})$/;

/**
 * Horário `HH:MM` da API no formato do idioma: pt-BR segue em 24 h (`15:00`); en-US vai para 12 h
 * via `Intl` (`3:00 PM`). Valor fora do padrão passa intacto. O espaço fino que o ICU põe antes de
 * AM/PM vira espaço comum (texto copiável e comparável).
 */
export const formatClockTime = (time: string, locale: Locale): string => {
  if (locale === "pt-BR") return time;
  const match = CLOCK.exec(time);
  if (!match) return time;
  const [, hours, minutes] = match;
  const date = new Date(Date.UTC(1970, 0, 1, Number(hours), Number(minutes)));
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })
    .format(date)
    .replace(/[  ]/g, " ");
};

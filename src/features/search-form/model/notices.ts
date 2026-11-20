import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { formatDate, type ISODate } from "@/shared/lib/dates";
import { searchFormMessages } from "../i18n/messages";

/** Avisos automáticos do formulário (visíveis e anunciados). */
export const formatCheckOutAdjusted = (
  checkOut: ISODate,
  locale: Locale = DEFAULT_LOCALE,
): string =>
  searchFormMessages
    .get(locale)
    .notices.checkOutAdjusted({ date: formatDate(checkOut, "short", locale) });

export const expiredDatesNotice = (locale: Locale = DEFAULT_LOCALE): string =>
  searchFormMessages.get(locale).notices.expiredDates;

export const formatRestored = (destination: string, locale: Locale = DEFAULT_LOCALE): string =>
  searchFormMessages.get(locale).notices.restored({ destination });

export type DateNotice = { field: "checkIn" | "checkOut"; text: string };

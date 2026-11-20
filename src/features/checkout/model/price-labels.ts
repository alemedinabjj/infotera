import type { Locale } from "@/shared/i18n/config";
import { formatUnit } from "@/shared/i18n/units";
import { checkoutMessages } from "../i18n/messages";

/** `3 noites · 1 quarto`, legenda do total na barra de ação. */
export const describeNightsAndRooms = (nights: number, rooms: number, locale: Locale): string =>
  `${formatUnit(nights, "night", locale)} · ${formatUnit(rooms, "room", locale)}`;

/** Quando hotel/quarto não carregaram: no lugar do total (barra e resumo). O retry fica no resumo. */
export const totalNotLoaded = (locale: Locale): string =>
  checkoutMessages.get(locale).price.notLoaded;

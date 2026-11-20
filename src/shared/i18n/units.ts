import { formatCount } from "../lib/format";
import { commonMessages } from "./common/messages";
import type { Locale } from "./config";
import { plural } from "./messages";

type UnitKey = keyof ReturnType<typeof commonMessages.get>["units"];

/** `2 noites` / `2 nights`: número agrupado pelo idioma e a unidade no singular só com `1` (zero é plural). */
export const formatUnit = (count: number, unit: UnitKey, locale: Locale): string =>
  `${formatCount(count, locale)} ${plural(count, commonMessages.get(locale).units[unit])}`;

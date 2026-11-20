import type { Locale } from "@/shared/i18n/config";
import { hotelSearchMessages } from "../i18n/messages";
import type { ListMode, SortOption } from "./search-filters";

export const sortLabel = (sort: SortOption, locale: Locale): string =>
  hotelSearchMessages.get(locale).controls.sort[sort];

export const listModeLabel = (mode: ListMode, locale: Locale): string =>
  hotelSearchMessages.get(locale).controls.listMode[mode];

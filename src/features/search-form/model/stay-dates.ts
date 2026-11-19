import { addDays, type ISODate, isValidISODate, nightsBetween } from "@/shared/lib/dates";
import { SEARCH_LIMITS } from "@/shared/lib/search-params";

type AdjustedCheckOut = {
  checkOut: ISODate;
  /** `true` só quando havia um check-out inválido que foi trocado (merece aviso). */
  adjusted: boolean;
};

/**
 * Mantém o check-out coerente com o check-in: vazio → check-in + 1 (silencioso);
 * ≤ check-in → check-in + 1 com aviso; mais de 30 noites → mantém (o erro do campo explica).
 */
export const adjustCheckOut = (checkIn: string, checkOut: string): AdjustedCheckOut => {
  if (!isValidISODate(checkIn)) return { checkOut, adjusted: false };
  const next = addDays(checkIn, SEARCH_LIMITS.minNights);
  if (!isValidISODate(checkOut)) return { checkOut: next, adjusted: false };
  if (nightsBetween(checkIn, checkOut) < SEARCH_LIMITS.minNights) {
    return { checkOut: next, adjusted: true };
  }
  return { checkOut, adjusted: false };
};

type DateBounds = {
  checkInMin: ISODate | undefined;
  checkOutMin: ISODate | undefined;
  checkOutMax: ISODate | undefined;
};

/** `min`/`max` dos inputs de data. `today` é `null` antes de hidratar (atributos omitidos). */
export const dateBounds = (today: ISODate | null, checkIn: string): DateBounds => {
  const hasCheckIn = isValidISODate(checkIn);
  const checkOutMinBase = hasCheckIn ? checkIn : today;
  return {
    checkInMin: today ?? undefined,
    checkOutMin: checkOutMinBase ? addDays(checkOutMinBase, SEARCH_LIMITS.minNights) : undefined,
    checkOutMax: hasCheckIn ? addDays(checkIn, SEARCH_LIMITS.maxNights) : undefined,
  };
};

/** Noites da estadia, ou `null` quando faltam datas ou o período é inválido (< 1 ou > 30). */
export const stayNights = (checkIn: string, checkOut: string): number | null => {
  if (!isValidISODate(checkIn) || !isValidISODate(checkOut)) return null;
  const nights = nightsBetween(checkIn, checkOut);
  return nights >= SEARCH_LIMITS.minNights && nights <= SEARCH_LIMITS.maxNights ? nights : null;
};

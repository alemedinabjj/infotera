import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { SEARCH_LIMITS } from "@/shared/lib/search-params";
import { searchFormMessages } from "../i18n/messages";

export type GuestCounts = { rooms: number; adults: number; children: number };
export type GuestField = keyof GuestCounts;
type Range = { min: number; max: number };
export type GuestLimits = Record<GuestField, Range>;

const { maxGuestsPerRoom, maxRooms, maxAdults, maxChildren } = SEARCH_LIMITS;

/**
 * Faixa permitida de cada contador dado o estado atual dos outros dois. Com isso a UI não
 * consegue montar um estado inválido (adultos < quartos ou mais de 5 hóspedes por quarto).
 */
export const guestLimits = ({ rooms, adults, children }: GuestCounts): GuestLimits => ({
  rooms: {
    min: Math.max(SEARCH_LIMITS.minRooms, Math.ceil((adults + children) / maxGuestsPerRoom)),
    max: Math.min(maxRooms, adults),
  },
  adults: { min: rooms, max: Math.min(maxAdults, rooms * maxGuestsPerRoom - children) },
  children: { min: 0, max: Math.min(maxChildren, rooms * maxGuestsPerRoom - adults) },
});

type Hints = ReturnType<typeof searchFormMessages.get>["guestHints"];

const capacityHint = (rooms: number, t: Hints): string =>
  rooms < maxRooms
    ? t.capacityMore({ max: maxGuestsPerRoom })
    : t.capacityMax({ max: maxGuestsPerRoom, rooms: maxRooms });

const adultsHint = (counts: GuestCounts, { min, max }: Range, t: Hints): string | null => {
  if (counts.adults >= max) {
    const capacityMax = counts.rooms * maxGuestsPerRoom - counts.children;
    return capacityMax <= maxAdults
      ? capacityHint(counts.rooms, t)
      : t.maxAdults({ max: maxAdults });
  }
  if (counts.adults <= min && min > 1) return t.adultPerRoom;
  return null;
};

const childrenHint = (counts: GuestCounts, { max }: Range, t: Hints): string | null => {
  if (counts.children < max) return null;
  const capacityMax = counts.rooms * maxGuestsPerRoom - counts.adults;
  return capacityMax <= maxChildren
    ? capacityHint(counts.rooms, t)
    : t.maxChildren({ max: maxChildren });
};

const roomsHint = (counts: GuestCounts, { min, max }: Range, t: Hints): string | null => {
  if (counts.rooms >= max) {
    return counts.adults >= maxRooms ? t.maxRooms({ max: maxRooms }) : t.addAdultForRooms;
  }
  if (counts.rooms <= min && min > 1) {
    return t.needRooms({ guests: counts.adults + counts.children, min });
  }
  return null;
};

/**
 * Motivo do limite de um contador: no máximo, explica o teto; no mínimo, só quando o mínimo
 * é maior que o natural (1 adulto, 0 crianças, 1 quarto). `null` quando não há o que explicar.
 */
export const guestHint = (
  field: GuestField,
  counts: GuestCounts,
  locale: Locale = DEFAULT_LOCALE,
): string | null => {
  const t = searchFormMessages.get(locale).guestHints;
  const range = guestLimits(counts)[field];
  switch (field) {
    case "adults":
      return adultsHint(counts, range, t);
    case "children":
      return childrenHint(counts, range, t);
    case "rooms":
      return roomsHint(counts, range, t);
    default: {
      const unreachable: never = field;
      return unreachable;
    }
  }
};

/**
 * Motivos de todos os contadores, sem repetir a mesma frase: quando dois controles batem no mesmo
 * limite (ex.: "Até 5 hóspedes por quarto" em Adultos e Crianças), só o que a pessoa acabou de
 * mexer (`lastChanged`) a mostra; sem essa informação, vale o primeiro da lista.
 */
export const guestHints = (
  counts: GuestCounts,
  lastChanged: GuestField | null = null,
  locale: Locale = DEFAULT_LOCALE,
): Record<GuestField, string | null> => {
  const hints: Record<GuestField, string | null> = {
    adults: guestHint("adults", counts, locale),
    children: guestHint("children", counts, locale),
    rooms: guestHint("rooms", counts, locale),
  };
  const order: GuestField[] = ["adults", "children", "rooms"];
  const shown = new Set<string>();
  const ranked =
    lastChanged === null ? order : [lastChanged, ...order.filter((f) => f !== lastChanged)];
  for (const field of ranked) {
    const text = hints[field];
    if (text === null) continue;
    if (shown.has(text)) hints[field] = null;
    else shown.add(text);
  }
  return hints;
};

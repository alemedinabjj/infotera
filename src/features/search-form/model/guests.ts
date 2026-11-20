import { SEARCH_LIMITS } from "@/shared/lib/search-params";

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

const capacityHint = (rooms: number): string =>
  rooms < maxRooms
    ? `Até ${maxGuestsPerRoom} hóspedes por quarto. Adicione um quarto para incluir mais pessoas.`
    : `Até ${maxGuestsPerRoom} hóspedes por quarto, em no máximo ${maxRooms} quartos.`;

const adultsHint = (counts: GuestCounts, { min, max }: Range): string | null => {
  if (counts.adults >= max) {
    const capacityMax = counts.rooms * maxGuestsPerRoom - counts.children;
    return capacityMax <= maxAdults
      ? capacityHint(counts.rooms)
      : `Máximo de ${maxAdults} adultos por busca.`;
  }
  if (counts.adults <= min && min > 1) return "Cada quarto precisa de pelo menos 1 adulto.";
  return null;
};

const childrenHint = (counts: GuestCounts, { max }: Range): string | null => {
  if (counts.children < max) return null;
  const capacityMax = counts.rooms * maxGuestsPerRoom - counts.adults;
  return capacityMax <= maxChildren
    ? capacityHint(counts.rooms)
    : `Máximo de ${maxChildren} crianças por busca.`;
};

const roomsHint = (counts: GuestCounts, { min, max }: Range): string | null => {
  if (counts.rooms >= max) {
    return counts.adults >= maxRooms
      ? `Máximo de ${maxRooms} quartos por busca.`
      : "Cada quarto precisa de pelo menos 1 adulto. Adicione um adulto para incluir mais quartos.";
  }
  if (counts.rooms <= min && min > 1) {
    return `Com ${counts.adults + counts.children} hóspedes, são necessários pelo menos ${min} quartos.`;
  }
  return null;
};

/**
 * Motivo do limite de um contador: no máximo, explica o teto; no mínimo, só quando o mínimo
 * é maior que o natural (1 adulto, 0 crianças, 1 quarto). `null` quando não há o que explicar.
 */
export const guestHint = (field: GuestField, counts: GuestCounts): string | null => {
  const range = guestLimits(counts)[field];
  switch (field) {
    case "adults":
      return adultsHint(counts, range);
    case "children":
      return childrenHint(counts, range);
    case "rooms":
      return roomsHint(counts, range);
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
): Record<GuestField, string | null> => {
  const hints: Record<GuestField, string | null> = {
    adults: guestHint("adults", counts),
    children: guestHint("children", counts),
    rooms: guestHint("rooms", counts),
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

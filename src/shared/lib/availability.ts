import { commonMessages } from "../i18n/common/messages";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";
import { plural } from "../i18n/messages";
import { formatUnit } from "../i18n/units";
/** Quartos restantes a partir dos quais o card avisa que está acabando. */
export const SCARCE_THRESHOLD = 2;

export type AvailabilityStatus =
  | "sold-out"
  | "insufficient"
  /** Há quartos livres, mas nenhum comporta o grupo na quantidade de quartos pedida. */
  | "no-fit"
  | "scarce"
  | "available";

/**
 * Disponibilidade do hotel para a busca: sem quartos (`sold-out`), menos quartos que o pedido
 * (`insufficient`), poucos (`scarce`, ≤ 2) ou `available`. No modo `browse` use `requestedRooms = 1`.
 */
export const availabilityStatus = (
  availableRooms: number,
  requestedRooms: number,
): AvailabilityStatus => {
  if (availableRooms <= 0) return "sold-out";
  if (availableRooms < requestedRooms) return "insufficient";
  if (availableRooms <= SCARCE_THRESHOLD) return "scarce";
  return "available";
};

export type AvailabilityBadge = { tone: "danger" | "warning"; text: string };

export type AvailabilityDescription = {
  badge: AvailabilityBadge | null;
  /** Frase ao lado do preço quando o total não pode ser mostrado. */
  note: string | null;
};

type DescribeInput = {
  status: AvailabilityStatus;
  /** Hóspedes da busca (adultos + crianças), para o texto de `no-fit`. */
  guests?: number;
  locale?: Locale;
  availableRooms: number;
  requestedRooms: number;
  /** `stay` tem datas; no `browse` o esgotado diz "no momento". */
  hasDates: boolean;
};

const roomsText = (count: number, locale: Locale): string => formatUnit(count, "room", locale);

/** Selo e nota do card para cada disponibilidade (textos do design system §6.6). */
export const describeAvailability = ({
  status,
  availableRooms,
  requestedRooms,
  hasDates,
  guests = 0,
  locale = DEFAULT_LOCALE,
}: DescribeInput): AvailabilityDescription => {
  const t = commonMessages.get(locale).availability;
  switch (status) {
    case "sold-out":
      return {
        badge: { tone: "danger", text: t.soldOut },
        note: hasDates ? t.soldOutDates : t.soldOutNow,
      };
    case "insufficient":
      return {
        badge: {
          tone: "warning",
          text: t.onlyRoomsAvailable({
            count: availableRooms,
            rooms: plural(availableRooms, t.roomAvailable),
          }),
        },
        note: t.requestAsks({ rooms: roomsText(requestedRooms, locale) }),
      };
    case "no-fit":
      return {
        badge: { tone: "warning", text: t.noFitBadge },
        note: t.noFitNote({
          guests: formatUnit(guests, "guest", locale),
          rooms: roomsText(requestedRooms, locale),
        }),
      };
    case "scarce":
      return {
        badge: { tone: "warning", text: t.scarce({ rooms: roomsText(availableRooms, locale) }) },
        note: null,
      };
    case "available":
      return { badge: null, note: null };
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
};

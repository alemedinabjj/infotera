import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { formatDate, formatDateRange, type ISODate } from "@/shared/lib/dates";
import { guestsPerRoom, type SearchCriteria } from "@/shared/lib/search-params";
import { checkoutMessages } from "../i18n/messages";
import type { RoomEligibility } from "./checkout-gate";

export type BlockedReason = Exclude<RoomEligibility, "ready" | "mismatch">;

export type BlockedCopy = {
  title: string;
  description: string;
  /** Rótulo da ação principal. */
  action: string;
};

type BlockedInput = {
  reason: BlockedReason;
  criteria: SearchCriteria;
  roomName: string | null;
  available: number | null;
  maxGuests: number | null;
  today: ISODate;
  locale?: Locale;
};

/** Texto de cada estado bloqueante (design system §6.6). */
export const describeBlocked = ({
  reason,
  criteria,
  roomName,
  available,
  maxGuests,
  today,
  locale = DEFAULT_LOCALE,
}: BlockedInput): BlockedCopy => {
  const t = checkoutMessages.get(locale);
  const room = roomName ?? t.blocked.roomFallback;
  switch (reason) {
    case "sold-out":
      return {
        title: t.blocked.soldOut.title,
        description: t.blocked.soldOut.description(
          room,
          formatDateRange(criteria.checkIn, criteria.checkOut, today, locale),
        ),
        action: t.viewRooms,
      };
    case "insufficient":
      return {
        title: t.blocked.insufficient.title(available ?? 0),
        description: t.blocked.insufficient.description(criteria.rooms, room),
        action: t.viewRooms,
      };
    case "too-small":
      return {
        title: t.blocked.tooSmall.title,
        description: t.blocked.tooSmall.description(room, maxGuests ?? 0, guestsPerRoom(criteria)),
        action: t.viewRooms,
      };
    case "stale-dates":
      return {
        title: t.blocked.staleDates.title,
        description: t.blocked.staleDates.description(
          formatDate(criteria.checkIn, "short", locale),
        ),
        action: t.blocked.chooseDates,
      };
    default: {
      const unreachable: never = reason;
      return unreachable;
    }
  }
};

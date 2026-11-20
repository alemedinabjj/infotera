import type { Locale } from "@/shared/i18n/config";
import { confirmationMessages } from "../i18n/messages";
import type { RoomView } from "../model/confirmation-view";

/** Quarto `ok`, `missing` (inclui quarto de outro hotel) ou `error` (o `ErrorState` explica). */
export const RoomBlock = ({ room, locale }: { room: RoomView; locale: Locale }) => {
  const label = confirmationMessages.get(locale).stay.room;
  switch (room.status) {
    case "ok":
      return (
        <dl>
          <dt className="text-sm text-fg-muted">{label}</dt>
          <dd className="text-base font-semibold wrap-anywhere text-fg">
            {room.name}
            {room.beds ? (
              <span className="block text-sm font-normal text-fg-muted">{room.beds}</span>
            ) : null}
          </dd>
        </dl>
      );
    case "missing":
      return (
        <dl>
          <dt className="text-sm text-fg-muted">{label}</dt>
          <dd className="text-base font-semibold text-fg">
            {room.title}
            <span className="block text-sm font-normal text-fg-muted">{room.notice}</span>
          </dd>
        </dl>
      );
    case "error":
      return null;
    default: {
      const unreachable: never = room;
      return unreachable;
    }
  }
};

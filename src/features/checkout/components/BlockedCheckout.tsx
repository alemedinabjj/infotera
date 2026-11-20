"use client";

import Link from "next/link";
import type { Room } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { todayISO } from "@/shared/lib/dates";
import type { RoomSelection } from "@/shared/stores/booking-draft";
import { buttonClassName, EmptyState } from "@/shared/ui";
import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { type BlockedReason, describeBlocked } from "../model/blocked";
import { hotelBackHref } from "../model/checkout-gate";

type BlockedCheckoutProps = {
  reason: BlockedReason;
  selection: RoomSelection;
  room: Room | undefined;
};

/**
 * Estado bloqueante: substitui a página inteira (h1 próprio, o motivo e uma saída). Sem formulário
 * nem barra. O bloqueio só vale na entrada, então não há foco a recuperar: nada de foco programático
 * (e de anel de foco) no h1.
 */
export const BlockedCheckout = ({ reason, selection, room }: BlockedCheckoutProps) => {
  const locale = useLocale();
  const t = useCheckoutMessages();
  const copy = describeBlocked({
    reason,
    criteria: selection.criteria,
    roomName: room?.name ?? null,
    available: room?.available ?? null,
    maxGuests: room?.maxGuests ?? null,
    today: todayISO(),
    locale,
  });

  useDocumentTitle(copy.title);

  return (
    <div>
      <EmptyState
        headingLevel={1}
        title={copy.title}
        description={copy.description}
        action={
          <>
            <Link
              href={localizePath(locale, hotelBackHref(selection, reason))}
              className={buttonClassName({ variant: "primary" })}
            >
              {copy.action}
            </Link>
            <Link
              href={localizePath(locale, "/")}
              className={buttonClassName({ variant: "ghost" })}
            >
              {t.newSearch}
            </Link>
          </>
        }
      />
    </div>
  );
};

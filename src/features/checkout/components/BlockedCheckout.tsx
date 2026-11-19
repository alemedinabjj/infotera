"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Room } from "@/shared/api/schemas";
import { todayISO } from "@/shared/lib/dates";
import type { RoomSelection } from "@/shared/stores/booking-draft";
import { buttonClassName, EmptyState } from "@/shared/ui";
import { type BlockedReason, describeBlocked } from "../model/blocked";
import { hotelBackHref } from "../model/checkout-gate";

type BlockedCheckoutProps = {
  reason: BlockedReason;
  selection: RoomSelection;
  room: Room | undefined;
};

/**
 * Estado bloqueante: substitui a página inteira (h1 próprio, o motivo e uma saída). Sem formulário
 * nem barra. Se o foco estava no formulário quando o bloqueio chegou, vai para o h1.
 */
export const BlockedCheckout = ({ reason, selection, room }: BlockedCheckoutProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const copy = describeBlocked({
    reason,
    criteria: selection.criteria,
    roomName: room?.name ?? null,
    available: room?.available ?? null,
    maxGuests: room?.maxGuests ?? null,
    today: todayISO(),
  });

  useEffect(() => {
    if (document.activeElement !== document.body) return;
    const heading = ref.current?.querySelector("h1");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={ref}>
      <title>{`${copy.title} | Infotera Hotéis`}</title>
      <EmptyState
        headingLevel={1}
        title={copy.title}
        description={copy.description}
        action={
          <>
            <Link
              href={hotelBackHref(selection, reason)}
              className={buttonClassName({ variant: "primary" })}
            >
              {copy.action}
            </Link>
            <Link href="/" className={buttonClassName({ variant: "ghost" })}>
              Fazer nova busca
            </Link>
          </>
        }
      />
    </div>
  );
};

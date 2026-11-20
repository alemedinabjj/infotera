"use client";

import { type ReactNode, use } from "react";
import type { Room } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import type { Locale } from "@/shared/i18n/config";
import { isBeforeToday, nightsBetween, todayISO } from "@/shared/lib/dates";
import { stayTotalWithFees } from "@/shared/lib/pricing";
import { type SearchCriteria, searchCriteriaToQueryString } from "@/shared/lib/search-params";
import { Badge, InfoIcon, PriceTag } from "@/shared/ui";
import { useSelectRoom } from "../hooks/useSelectRoom";
import {
  type RoomSelectability,
  roomSelectability,
  selectabilityBadge,
  selectabilityMessage,
} from "../model/room-selectability";
import { RoomFooterLayout } from "./RoomFooterLayout";
import { useRoomSelection } from "./RoomSelectionContext";
import { SelectRoomButton } from "./SelectRoomButton";
import { useStayEdit } from "./StayEditContext";

type RoomStayActionProps = {
  hotelId: number;
  room: Room;
  /** O hotel tem outro tipo de quarto (os motivos de bloqueio só sugerem "outro" nesse caso). */
  otherRooms: boolean;
  /** Promessa dos critérios: pendente na casca (vira fallback), resolvida por request. */
  criteria: Promise<SearchCriteria | null>;
  badge: ReactNode;
  nightly: ReactNode;
};

const Total = ({
  room,
  criteria,
  selectability,
}: {
  room: Room;
  criteria: SearchCriteria | null;
  selectability: RoomSelectability;
}) => {
  const locale = useLocale();
  if (criteria === null || selectability.kind !== "selectable") return null;
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const total = stayTotalWithFees({
    pricePerNight: room.pricePerNight,
    nights,
    rooms: criteria.rooms,
  });
  return (
    <PriceTag
      locale={locale}
      variant="stay-total"
      total={total}
      nights={nights}
      rooms={criteria.rooms}
    />
  );
};

/**
 * "Só N disponíveis" (a busca pede mais quartos que os livres) troca o selo estático do quarto, na
 * mesma posição e com a mesma altura. Nos demais casos vale o selo da casca (`badge`).
 */
const stayBadge = (selectability: RoomSelectability, locale: Locale, fallback: ReactNode) => {
  if (selectability.kind !== "insufficient") return fallback;
  const dynamic = selectabilityBadge(selectability, locale);
  return dynamic ? <Badge tone={dynamic.tone}>{dynamic.text}</Badge> : fallback;
};

/**
 * O que do card do quarto depende da estadia: selo "Só N disponíveis", total, motivo e botão. Ilha cliente que
 * espera a promessa dos critérios (`use`): na casca ela fica pendente e o Suspense mostra o
 * `RoomStayActionSkeleton`; por request resolve na hora. A regra é `roomSelectability`.
 */
export const RoomStayAction = ({
  hotelId,
  room,
  otherRooms,
  criteria: criteriaPromise,
  badge,
  nightly,
}: RoomStayActionProps) => {
  const criteria = use(criteriaPromise);
  const locale = useLocale();
  const key = criteria ? searchCriteriaToQueryString(criteria) : "none";
  const { pickDates } = useStayEdit(key);
  const { select } = useSelectRoom(hotelId, criteria);
  const { pendingRoomId } = useRoomSelection();
  const pastDates = criteria ? isBeforeToday(criteria.checkIn, todayISO()) : false;
  const selectability = roomSelectability(room, criteria, pastDates);
  const reason = selectabilityMessage(selectability, criteria !== null, otherRooms, locale);
  const reasonId = reason ? `room-${room.id}-reason` : null;
  const selecting = pendingRoomId === room.id;
  return (
    <RoomFooterLayout
      selecting={selecting}
      badge={stayBadge(selectability, locale, badge)}
      nightly={nightly}
      total={<Total room={room} criteria={criteria} selectability={selectability} />}
      reason={
        reason ? (
          <p id={reasonId ?? undefined} className="flex items-start gap-1 text-sm text-fg-muted">
            <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {reason}
          </p>
        ) : null
      }
      action={
        <SelectRoomButton
          room={room}
          selectability={selectability}
          reasonId={reasonId}
          loading={selecting}
          onSelect={() => {
            if (pendingRoomId === null) select(room.id);
          }}
          onPickDates={pickDates}
        />
      }
    />
  );
};

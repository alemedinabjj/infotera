"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Booking, Hotel } from "@/shared/api/schemas";
import { useToday } from "@/shared/hooks/useToday";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { formatUnit } from "@/shared/i18n/units";
import { formatBRL } from "@/shared/lib/currency";
import { formatDate, formatDateRange, nightsBetween } from "@/shared/lib/dates";
import { formatGuests } from "@/shared/lib/format";
import { Badge, buttonClassName, RemoteImage, Skeleton } from "@/shared/ui";
import { useHistoryMessages } from "../hooks/useHistoryMessages";
import { stayStatus, stayStatusTone } from "../model/stay-status";

type HotelName = { state: "loading" | "ready" | "unavailable"; hotel: Hotel | undefined };

type HistoryItemProps = {
  booking: Booking;
  hotel: HotelName;
  removeButton: (label: string) => ReactNode;
};

const Title = ({ hotel }: { hotel: HotelName }) => {
  const MESSAGES = useHistoryMessages();
  if (hotel.state === "loading") return <Skeleton className="h-7 w-3/4" />;
  return (
    <h2 className="text-lg font-semibold text-fg">
      {hotel.hotel?.name ?? MESSAGES.hotelUnavailable}
    </h2>
  );
};

/**
 * Linha de uma reserva encontrada: hotel, datas e noites, hóspedes, total, situação da estadia e
 * ações. Nunca mostra titular, e-mail, telefone, documento nem o id completo.
 */
export const HistoryItem = ({ booking, hotel, removeButton }: HistoryItemProps) => {
  const MESSAGES = useHistoryMessages();
  const locale = useLocale();
  const today = useToday();
  const status = today ? stayStatus(booking.checkIn, booking.checkOut, today) : null;
  const dates = formatDateRange(
    booking.checkIn,
    booking.checkOut,
    today ?? booking.checkIn,
    locale,
  );
  const nights = formatUnit(nightsBetween(booking.checkIn, booking.checkOut), "night", locale);
  const name = hotel.hotel?.name ?? MESSAGES.hotelUnavailable;

  return (
    <div className="flex flex-col sm:flex-row">
      <div className="hidden w-40 shrink-0 sm:block">
        {hotel.hotel ? (
          <RemoteImage
            src={hotel.hotel.thumbnail}
            alt=""
            sizes="10rem"
            className="size-full min-h-32"
          />
        ) : (
          <div className="size-full min-h-32 bg-surface-sunken" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="min-h-6">
          {status ? <Badge tone={stayStatusTone(status)}>{MESSAGES.stay[status]}</Badge> : null}
        </div>
        <Title hotel={hotel} />
        <p className="text-sm text-fg-muted tabular-nums">
          {dates} · {nights} · {formatGuests(booking, locale)}
        </p>
        <p className="whitespace-nowrap">
          <span className="text-xl font-bold text-fg tabular-nums">
            {formatBRL(booking.totalPrice, { locale })}
          </span>{" "}
          <span className="text-sm text-fg-muted">{MESSAGES.total}</span>
        </p>
        <p className="text-sm text-fg-subtle">
          {MESSAGES.bookedOn(formatDate(booking.createdAt.slice(0, 10), "short", locale))}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href={localizePath(locale, `/confirmation/${encodeURIComponent(String(booking.id))}`)}
            aria-label={MESSAGES.viewBookingLabel(name)}
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            {MESSAGES.viewBooking}
          </Link>
          {removeButton(MESSAGES.removeLabel(name, dates))}
        </div>
      </div>
    </div>
  );
};

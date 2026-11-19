"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Booking, Hotel } from "@/shared/api/schemas";
import { useToday } from "@/shared/hooks/useToday";
import { formatBRL } from "@/shared/lib/currency";
import { formatDate, formatDateRange, nightsBetween } from "@/shared/lib/dates";
import { formatGuests } from "@/shared/lib/format";
import { Badge, buttonClassName, RemoteImage, Skeleton } from "@/shared/ui";
import { HISTORY_MESSAGES } from "../model/messages";
import { stayStatus, stayStatusLabel } from "../model/stay-status";

const MESSAGES = HISTORY_MESSAGES;

type HotelName = { state: "loading" | "ready" | "unavailable"; hotel: Hotel | undefined };

type HistoryItemProps = {
  booking: Booking;
  hotel: HotelName;
  removeButton: (label: string) => ReactNode;
};

const Title = ({ hotel }: { hotel: HotelName }) => {
  if (hotel.state === "loading") return <Skeleton className="h-7 w-3/4" />;
  return (
    <h2 className="text-lg font-semibold text-fg">
      {hotel.hotel?.name ?? MESSAGES.hotelUnavailable}
    </h2>
  );
};

/** Nome para rótulos: o do hotel ou o texto de indisponível. */
export const hotelLabel = (hotel: HotelName): string =>
  hotel.hotel?.name ?? MESSAGES.hotelUnavailable;

/**
 * Linha de uma reserva encontrada: hotel, datas e noites, hóspedes, total, situação da estadia e
 * ações. Nunca mostra titular, e-mail, telefone, documento nem o id completo.
 */
export const HistoryItem = ({ booking, hotel, removeButton }: HistoryItemProps) => {
  const today = useToday();
  const status = today
    ? stayStatusLabel(stayStatus(booking.checkIn, booking.checkOut, today))
    : null;
  const dates = formatDateRange(booking.checkIn, booking.checkOut, today ?? booking.checkIn);
  const nights = MESSAGES.stay.nights(nightsBetween(booking.checkIn, booking.checkOut));
  const name = hotelLabel(hotel);

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
          {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
        </div>
        <Title hotel={hotel} />
        <p className="text-sm text-fg-muted tabular-nums">
          {dates} · {nights} · {formatGuests(booking)}
        </p>
        <p className="whitespace-nowrap">
          <span className="text-xl font-bold text-fg tabular-nums">
            {formatBRL(booking.totalPrice)}
          </span>{" "}
          <span className="text-sm text-fg-muted">{MESSAGES.total}</span>
        </p>
        <p className="text-sm text-fg-subtle">
          {MESSAGES.bookedOn(formatDate(booking.createdAt.slice(0, 10)))}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href={`/confirmation/${encodeURIComponent(String(booking.id))}`}
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

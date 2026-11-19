"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Hotel, Room } from "@/shared/api/schemas";
import { cancellationDetails } from "@/shared/lib/cancellation";
import { cn } from "@/shared/lib/cn";
import { todayISO } from "@/shared/lib/dates";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import {
  Button,
  CheckCircleIcon,
  ChevronDownIcon,
  ErrorState,
  MapPinIcon,
  RemoteImage,
  Skeleton,
} from "@/shared/ui";
import {
  describeDatesAndNights,
  describeGuestsAndRooms,
  describeLongDate,
} from "../model/summary-labels";

export const SUMMARY_TITLE_ID = "booking-summary-title";
export const SUMMARY_TOGGLE_ID = "booking-summary-toggle";
const PANEL_ID = "booking-summary-panel";

type BookingSummaryProps = {
  hotel: UseQueryResult<Hotel>;
  room: UseQueryResult<Room>;
  hotelId: number;
  criteria: SearchCriteria;
  /** Painel de detalhes aberto (abaixo de `lg`; no `lg+` ele é sempre visível). */
  open: boolean;
  onToggle: () => void;
  /** Quartos, cupom e detalhamento do preço (compostos pelo workspace). */
  children: ReactNode;
};

const HotelIdentity = ({ hotel, room }: Pick<BookingSummaryProps, "hotel" | "room">) => (
  <div className="flex gap-3">
    {hotel.data ? (
      <RemoteImage
        src={hotel.data.thumbnail}
        alt=""
        sizes="96px"
        className="aspect-[4/3] w-20 shrink-0 rounded-control lg:w-24"
      />
    ) : hotel.isError ? null : (
      <Skeleton shape="block" className="aspect-[4/3] w-20 shrink-0 lg:w-24" />
    )}
    <div className="flex min-w-0 flex-col gap-1">
      {hotel.data ? (
        <p className="line-clamp-2 text-base font-semibold text-fg">{hotel.data.name}</p>
      ) : hotel.isError ? null : (
        <Skeleton className="h-6 w-3/4" />
      )}
      {room.data ? (
        <p className="text-sm text-fg-muted">{room.data.name}</p>
      ) : room.isError ? (
        <p className="text-sm text-fg-muted">Quarto indisponível no momento</p>
      ) : (
        <Skeleton className="h-5 w-1/2" />
      )}
    </div>
  </div>
);

const toneClass = { success: "text-success", neutral: "text-fg", warning: "text-warning" } as const;

const Cancellation = ({ hotel, failed }: { hotel: Hotel | undefined; failed: boolean }) => {
  if (failed) return null;
  if (!hotel) return <Skeleton className="h-5 w-40" />;
  const details = cancellationDetails(hotel.cancellationPolicy);
  return (
    <p className={cn("flex items-center gap-1.5 text-sm", toneClass[details.tone])}>
      <CheckCircleIcon className="size-4 shrink-0" />
      {details.label}
    </p>
  );
};

/** Horário do hotel: skeleton enquanto carrega, nada se o hotel falhou (o erro já está no topo). */
const HotelTime = ({
  hotel,
  text,
}: {
  hotel: UseQueryResult<Hotel>;
  text: (hotel: Hotel) => string;
}) => {
  if (hotel.data) return <>{text(hotel.data)}</>;
  return hotel.isError ? null : <Skeleton className="h-5 w-24" />;
};

const Details = ({
  hotel,
  criteria,
  hotelId,
}: Pick<BookingSummaryProps, "hotel" | "criteria" | "hotelId">) => (
  <>
    {hotel.data ? (
      <p className="flex items-start gap-1.5 text-sm text-fg-muted">
        <MapPinIcon className="mt-0.5 size-4 shrink-0" />
        {hotel.data.address}
      </p>
    ) : null}
    <dl className="grid grid-cols-2 gap-4">
      <div>
        <dt className="text-sm text-fg-muted">Check-in</dt>
        <dd className="text-base font-semibold tabular-nums">
          {describeLongDate(criteria.checkIn)}
        </dd>
        <dd className="text-sm text-fg-muted">
          <HotelTime hotel={hotel} text={(data) => `A partir de ${data.checkInTime}`} />
        </dd>
      </div>
      <div>
        <dt className="text-sm text-fg-muted">Check-out</dt>
        <dd className="text-base font-semibold tabular-nums">
          {describeLongDate(criteria.checkOut)}
        </dd>
        <dd className="text-sm text-fg-muted">
          <HotelTime hotel={hotel} text={(data) => `Até ${data.checkOutTime}`} />
        </dd>
      </div>
    </dl>
    <Link
      href={`${hotelHref(hotelId, criteria)}#quartos`}
      className="inline-flex min-h-11 items-center text-sm text-primary underline"
    >
      Alterar datas e hóspedes
    </Link>
  </>
);

/**
 * "Sua reserva": identidade, datas, hóspedes e cancelamento sempre à vista; o resto atrás de "Ver
 * detalhes da reserva" abaixo de `lg` (painel **montado**, só escondido, para não perder estado nem
 * regiões `aria-live`). No `lg+` é a coluna lateral. Erro do hotel só afeta o topo.
 */
export const BookingSummary = (props: BookingSummaryProps) => {
  const { hotel, room, criteria, open, onToggle, children } = props;
  const today = todayISO();
  return (
    <section
      aria-labelledby={SUMMARY_TITLE_ID}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto"
    >
      <h2 id={SUMMARY_TITLE_ID} className="text-lg font-semibold text-fg">
        Sua reserva
      </h2>
      {hotel.isError ? (
        <ErrorState
          headingLevel={3}
          title="Não foi possível carregar os dados do hotel."
          description="Verifique sua conexão e tente de novo."
          onRetry={() => void hotel.refetch()}
          retrying={hotel.isFetching}
          className="py-2"
        />
      ) : null}
      <HotelIdentity hotel={hotel} room={room} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium tabular-nums text-fg">
          {describeDatesAndNights(criteria, today)}
        </p>
        <p className="text-sm text-fg-muted">{describeGuestsAndRooms(criteria)}</p>
        <Cancellation hotel={hotel.data} failed={hotel.isError} />
      </div>
      <Button
        id={SUMMARY_TOGGLE_ID}
        variant="ghost"
        size="sm"
        fullWidth
        aria-expanded={open}
        aria-controls={PANEL_ID}
        rightIcon={
          <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
        }
        className="justify-between lg:hidden"
        onClick={onToggle}
      >
        Ver detalhes da reserva
      </Button>
      <div id={PANEL_ID} className={cn("flex-col gap-4", open ? "flex" : "hidden lg:flex")}>
        <Details hotel={hotel} criteria={criteria} hotelId={props.hotelId} />
        <div className="flex flex-col gap-4 border-t border-border pt-4">{children}</div>
      </div>
    </section>
  );
};

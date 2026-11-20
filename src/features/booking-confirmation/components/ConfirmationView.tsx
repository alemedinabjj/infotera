import { Suspense } from "react";
import type { Booking } from "@/shared/api/schemas";
import type { Locale } from "@/shared/i18n/config";
import type { ISODate } from "@/shared/lib/dates";
import type { StayDetails } from "../api/confirmation.server";
import { confirmationMessages } from "../i18n/messages";
import { toBookingView } from "../model/confirmation-view";
import { BookingNumber } from "./BookingNumber";
import { ConfirmationHeader } from "./ConfirmationHeader";
import { GuestList } from "./GuestList";
import { NewSearchLink } from "./NewSearchLink";
import { NextSteps } from "./NextSteps";
import { PaymentSummary } from "./PaymentSummary";
import { ReceiptSection } from "./ReceiptSection";
import { RememberBooking } from "./RememberBooking";
import { StayDetailsSection } from "./StayDetailsSection";
import { StayDetailsSkeleton } from "./StayDetailsSkeleton";
import { StaySummary } from "./StaySummary";
import { STAY_TITLE_ID } from "./stay-ids";

type ConfirmationViewProps = {
  booking: Booking;
  details: Promise<StayDetails>;
  today: ISODate;
  locale: Locale;
};

/**
 * Recibo da reserva, em uma coluna. O que vem da reserva aparece na hora (número, datas, hóspedes,
 * pagamento e preço); hotel, quarto e horários entram depois, em streaming, **abaixo** do botão de
 * copiar, com skeleton da mesma geometria.
 */
export const ConfirmationView = ({ booking, details, today, locale }: ConfirmationViewProps) => {
  const t = confirmationMessages.get(locale);
  const view = toBookingView(booking, today, locale);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 lg:gap-8">
      <ConfirmationHeader
        email={view.guests.holderEmail}
        bookedAt={view.bookedAt}
        locale={locale}
      />
      <BookingNumber
        number={view.number}
        stayLabel={view.stayLabel}
        totalCents={view.price.totalCents}
        locale={locale}
      />
      <ReceiptSection titleId={STAY_TITLE_ID} title={t.stay.title} focusable>
        <Suspense fallback={<StayDetailsSkeleton locale={locale} />}>
          <StayDetailsSection booking={booking} details={details} locale={locale} />
        </Suspense>
        <StaySummary view={view} details={details} locale={locale} />
      </ReceiptSection>
      {view.guests.lines.length > 0 ? (
        <GuestList guests={view.guests.lines} locale={locale} />
      ) : null}
      <PaymentSummary cardLast4={view.cardLast4} price={view.price} locale={locale} />
      <NextSteps locale={locale} />
      <div>
        <NewSearchLink responsiveWidth />
      </div>
      <RememberBooking id={view.number} />
    </div>
  );
};

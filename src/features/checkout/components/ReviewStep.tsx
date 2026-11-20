"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import type { Hotel, Room } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { contentLang } from "@/shared/i18n/config";
import { cancellationDetails } from "@/shared/lib/cancellation";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { Button, CheckCircleIcon, CreditCardIcon } from "@/shared/ui";
import type { CheckoutPrice } from "../hooks/checkout-price";
import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import type { CheckoutValues } from "../model/checkout.schema";
import { describeCard, describeDocument, describeGuests } from "../model/review-labels";
import type { CheckoutStep } from "../model/steps";
import { describeGuestsAndRooms, describeLongDate, describeNights } from "../model/summary-labels";
import { termsSections } from "../model/terms";
import { PriceBreakdown } from "./PriceBreakdown";
import { ReviewSection } from "./ReviewSection";
import { TermsField } from "./TermsField";

type ReviewStepProps = {
  hotel: UseQueryResult<Hotel>;
  room: UseQueryResult<Room>;
  criteria: SearchCriteria;
  price: CheckoutPrice;
  onEdit: (step: CheckoutStep) => void;
  onOpenSummary: () => void;
};

const StaySection = ({
  hotel,
  room,
  criteria,
}: Pick<ReviewStepProps, "hotel" | "room" | "criteria">) => {
  const locale = useLocale();
  const t = useCheckoutMessages().review;
  const lang = contentLang(locale);
  const details = hotel.data ? cancellationDetails(hotel.data.cancellationPolicy, locale) : null;
  return (
    <ReviewSection title={t.stay}>
      <p className="text-base text-fg">
        <span lang={hotel.data ? lang : undefined}>{hotel.data?.name ?? t.hotelFallback}</span>
        {" · "}
        <span lang={room.data ? lang : undefined}>{room.data?.name ?? t.roomFallback}</span>
      </p>
      <p className="text-sm text-fg-muted">
        {t.dateRange(
          describeLongDate(criteria.checkIn, locale),
          describeLongDate(criteria.checkOut, locale),
        )}{" "}
        · {describeNights(criteria, locale)}
      </p>
      <p className="text-sm text-fg-muted">{describeGuestsAndRooms(criteria, locale)}</p>
      {details ? (
        <>
          <p className="flex items-center gap-1.5 text-sm text-fg">
            <CheckCircleIcon className="size-4 shrink-0 text-success" />
            {details.label}
          </p>
          <p className="text-sm text-fg-muted">{details.details[0]}</p>
        </>
      ) : null}
    </ReviewSection>
  );
};

const GuestsSection = ({ values, onEdit }: { values: CheckoutValues; onEdit: () => void }) => {
  const locale = useLocale();
  const t = useCheckoutMessages().review;
  return (
    <ReviewSection title={t.guests} editLabel={t.guestsEdit} onEdit={onEdit}>
      <ul className="flex flex-col gap-1">
        {describeGuests(values, locale).map((guest) => (
          <li key={guest.key} className="flex flex-col">
            <span className="text-base text-fg">{guest.name}</span>
            {guest.detail ? <span className="text-sm text-fg-muted">{guest.detail}</span> : null}
          </li>
        ))}
      </ul>
    </ReviewSection>
  );
};

const PaymentSection = ({ values, onEdit }: { values: CheckoutValues; onEdit: () => void }) => {
  const locale = useLocale();
  const t = useCheckoutMessages().review;
  return (
    <ReviewSection title={t.payment} editLabel={t.paymentEdit} onEdit={onEdit}>
      <p className="flex items-center gap-2 text-base text-fg">
        <CreditCardIcon className="size-5 shrink-0" />
        {describeCard(values.payment, locale)}
      </p>
      <p className="text-sm text-fg-muted">{t.cardName(values.payment.cardName.trim())}</p>
      <p className="text-sm text-fg-muted">{describeDocument(values.payment, locale)}</p>
    </ReviewSection>
  );
};

/** Passo 3: dados em seções com "Editar"; cartão e documento sempre mascarados; termos. */
export const ReviewStep = ({
  hotel,
  room,
  criteria,
  price,
  onEdit,
  onOpenSummary,
}: ReviewStepProps) => {
  const { getValues } = useFormContext<CheckoutValues>();
  const locale = useLocale();
  const t = useCheckoutMessages().review;
  // Nada aqui é editável (só os termos): um snapshot por montagem basta.
  const values = getValues();
  const sections = termsSections(
    {
      policy: hotel.data?.cancellationPolicy ?? null,
      checkInTime: hotel.data?.checkInTime ?? null,
      checkOutTime: hotel.data?.checkOutTime ?? null,
    },
    locale,
  );
  return (
    <div className="flex flex-col gap-5">
      <StaySection hotel={hotel} room={room} criteria={criteria} />
      <GuestsSection values={values} onEdit={() => onEdit("personal")} />
      <PaymentSection values={values} onEdit={() => onEdit("payment")} />
      <ReviewSection title={t.values} className="lg:hidden">
        <PriceBreakdown price={price} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">{t.valuesHint}</p>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={onOpenSummary}>
            {t.openSummary}
          </Button>
        </div>
      </ReviewSection>
      <TermsField sections={sections} />
    </div>
  );
};

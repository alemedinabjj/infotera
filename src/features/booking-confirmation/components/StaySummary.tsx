import { Suspense } from "react";
import type { Locale } from "@/shared/i18n/config";
import { Skeleton } from "@/shared/ui";
import type { StayDetails } from "../api/confirmation.server";
import { confirmationMessages } from "../i18n/messages";
import type { BookingView } from "../model/confirmation-view";
import { CheckTimes } from "./CheckTimes";

type StaySummaryProps = {
  view: BookingView;
  details: Promise<StayDetails>;
  locale: Locale;
};

type DateCellProps = StaySummaryProps & { which: "check-in" | "check-out" };

const DateCell = ({ view, details, which, locale }: DateCellProps) => {
  const t = confirmationMessages.get(locale).stay;
  return (
    <div>
      <dt className="text-sm text-fg-muted">{which === "check-in" ? t.checkIn : t.checkOut}</dt>
      <dd className="text-base font-semibold text-fg tabular-nums">
        {which === "check-in" ? view.checkInDate : view.checkOutDate}
      </dd>
      <dd className="min-h-5 text-sm text-fg-muted">
        <Suspense fallback={<Skeleton className="h-5 w-28" />}>
          <CheckTimes details={details} which={which} locale={locale} />
        </Suspense>
      </dd>
    </div>
  );
};

/** Datas (da reserva, na hora), horários do hotel (streaming), noites e hóspedes. */
export const StaySummary = (props: StaySummaryProps) => (
  <div className="flex flex-col gap-4 border-t border-border pt-4">
    <dl className="grid grid-cols-2 gap-4">
      <DateCell {...props} which="check-in" />
      <DateCell {...props} which="check-out" />
    </dl>
    <p className="text-sm text-fg-muted tabular-nums">{props.view.stayDetails}</p>
  </div>
);

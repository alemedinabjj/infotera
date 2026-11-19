import { Suspense } from "react";
import type { Booking } from "@/shared/api/schemas";
import { Skeleton } from "@/shared/ui";
import type { StayDetails } from "../api/confirmation.server";
import type { BookingView } from "../model/confirmation-view";
import { CheckTimes } from "./CheckTimes";

type StaySummaryProps = {
  booking: Booking;
  view: BookingView;
  details: Promise<StayDetails>;
};

type DateCellProps = StaySummaryProps & { which: "check-in" | "check-out" };

const DateCell = ({ booking, view, details, which }: DateCellProps) => (
  <div>
    <dt className="text-sm text-fg-muted">{which === "check-in" ? "Check-in" : "Check-out"}</dt>
    <dd className="text-base font-semibold text-fg tabular-nums">
      {which === "check-in" ? view.checkInDate : view.checkOutDate}
    </dd>
    <dd className="min-h-5 text-sm text-fg-muted">
      <Suspense fallback={<Skeleton className="h-5 w-28" />}>
        <CheckTimes booking={booking} details={details} which={which} />
      </Suspense>
    </dd>
  </div>
);

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

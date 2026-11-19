import type { Booking } from "@/shared/api/schemas";
import type { StayDetails } from "../api/confirmation.server";
import { toStayView } from "../model/confirmation-view";

type CheckTimesProps = {
  booking: Booking;
  details: Promise<StayDetails>;
  which: "check-in" | "check-out";
};

/** Horário do hotel: entra depois (Suspense próprio), sem mexer nas datas, que vêm da reserva. */
export const CheckTimes = async ({ booking, details, which }: CheckTimesProps) => {
  const { hotel, room } = await details;
  const view = toStayView(booking, hotel, room);
  return <>{which === "check-in" ? view.checkInTime : view.checkOutTime}</>;
};

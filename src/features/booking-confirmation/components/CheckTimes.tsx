import type { Locale } from "@/shared/i18n/config";
import type { StayDetails } from "../api/confirmation.server";
import { checkTimes } from "../model/confirmation-view";

type CheckTimesProps = {
  details: Promise<StayDetails>;
  which: "check-in" | "check-out";
  locale: Locale;
};

/** Horário do hotel: entra depois (Suspense próprio), sem mexer nas datas, que vêm da reserva. */
export const CheckTimes = async ({ details, which, locale }: CheckTimesProps) => {
  const { hotel } = await details;
  const times = checkTimes(hotel, locale);
  return <>{which === "check-in" ? times.checkInTime : times.checkOutTime}</>;
};

import type { StayDetails } from "../api/confirmation.server";
import { checkTimes } from "../model/confirmation-view";

type CheckTimesProps = {
  details: Promise<StayDetails>;
  which: "check-in" | "check-out";
};

/** Horário do hotel: entra depois (Suspense próprio), sem mexer nas datas, que vêm da reserva. */
export const CheckTimes = async ({ details, which }: CheckTimesProps) => {
  const { hotel } = await details;
  const times = checkTimes(hotel);
  return <>{which === "check-in" ? times.checkInTime : times.checkOutTime}</>;
};

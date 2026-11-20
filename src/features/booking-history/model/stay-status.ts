import type { ISODate } from "@/shared/lib/dates";

export type StayStatus = "upcoming" | "ongoing" | "completed";

/**
 * Situação da estadia em relação a `today`: antes do check-in é `upcoming`; do dia do check-in até a
 * véspera do check-out é `ongoing`; no dia do check-out já é `completed`. (Datas ISO comparam como texto.)
 */
export const stayStatus = (checkIn: ISODate, checkOut: ISODate, today: ISODate): StayStatus => {
  if (today < checkIn) return "upcoming";
  return today >= checkOut ? "completed" : "ongoing";
};

export type StayStatusTone = "info" | "success" | "neutral";

/** Cor do selo da situação; o texto vem do dicionário (`stay[status]`). */
export const stayStatusTone = (status: StayStatus): StayStatusTone => {
  switch (status) {
    case "upcoming":
      return "info";
    case "ongoing":
      return "success";
    case "completed":
      return "neutral";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
};

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

type StayStatusLabel = { label: string; tone: "info" | "success" | "neutral" };

export const stayStatusLabel = (status: StayStatus): StayStatusLabel => {
  switch (status) {
    case "upcoming":
      return { label: "Próxima estadia", tone: "info" };
    case "ongoing":
      return { label: "Em andamento", tone: "success" };
    case "completed":
      return { label: "Concluída", tone: "neutral" };
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
};

import { formatDate, type ISODate } from "@/shared/lib/dates";

/** Avisos automáticos do formulário (visíveis e anunciados). */
export const formatCheckOutAdjusted = (checkOut: ISODate): string =>
  `Check\u2011out ajustado para ${formatDate(checkOut)}.`;

export const EXPIRED_DATES_NOTICE = "As datas dessa busca já passaram. Escolha novas datas.";

export const formatRestored = (destination: string): string =>
  `Busca preenchida: ${destination}. Confira e busque hotéis.`;

/** Aviso visível sob um dos campos de data. */
export type DateNotice = { field: "checkIn" | "checkOut"; text: string };

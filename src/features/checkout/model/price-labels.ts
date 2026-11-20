import { pluralize } from "@/shared/lib/format";

/** `3 noites · 1 quarto`, legenda do total na barra de ação. */
export const describeNightsAndRooms = (nights: number, rooms: number): string =>
  `${pluralize(nights, "noite", "noites")} · ${pluralize(rooms, "quarto", "quartos")}`;

/** Quando hotel/quarto não carregaram: no lugar do total (barra e resumo). O retry fica no resumo. */
export const TOTAL_NOT_LOADED = "Total não carregado — tente de novo";

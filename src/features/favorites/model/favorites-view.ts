import type { Hotel } from "@/shared/api/schemas";

export type FavoritesView = "hydrating" | "empty" | "loading" | "offline" | "error" | "success";

type ViewInput = {
  /** O storage já foi lido. */
  hydrated: boolean;
  /** Quantos ids estão no snapshot da página. */
  count: number;
  status: "pending" | "error" | "success";
  /** `paused` = sem rede e sem dados. */
  fetchStatus: "fetching" | "paused" | "idle";
};

/**
 * Qual tela mostrar. Antes de ler o storage é `hydrating` (skeleton, nunca "vazio" falso); sem ids
 * é `empty` (sem request); depois segue o estado da consulta.
 */
export const deriveFavoritesView = ({
  hydrated,
  count,
  status,
  fetchStatus,
}: ViewInput): FavoritesView => {
  if (!hydrated) return "hydrating";
  if (count === 0) return "empty";
  switch (status) {
    case "success":
      return "success";
    case "error":
      return "error";
    case "pending":
      return fetchStatus === "paused" ? "offline" : "loading";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
};

/** Hotéis na ordem do snapshot (mais recente primeiro); ids que a API não devolveu somem. */
export const orderBySnapshot = (
  hotels: readonly Hotel[],
  snapshotIds: readonly number[],
): Hotel[] =>
  snapshotIds.flatMap((id) => {
    const hotel = hotels.find((item) => item.id === id);
    return hotel ? [hotel] : [];
  });

/** Preço do card: carregando (skeleton), "a partir de" pelos quartos ou indisponível. */
export type PriceState =
  | { state: "loading" }
  | { state: "ready"; nightly: number }
  | { state: "unavailable" };

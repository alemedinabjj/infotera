import type { BookingLoad } from "./load-result";

const SITE = "Infotera Hotéis";

/** A página tem PII e é "secreta" pelo link: nunca indexar nem seguir links dela. */
export const CONFIRMATION_ROBOTS = { index: false, follow: false } as const;

/** Título genérico por estado: nunca leva nome, e-mail nem o id da reserva. */
export const confirmationTitle = (load: BookingLoad): string => {
  switch (load.kind) {
    case "found":
      return `Reserva confirmada | ${SITE}`;
    case "not-found":
      return `Reserva não encontrada | ${SITE}`;
    case "unreadable":
      return `Reserva indisponível | ${SITE}`;
    default: {
      const unreachable: never = load;
      return unreachable;
    }
  }
};

/** Título usado quando ler a reserva falha no metadata (o metadata nunca derruba a página). */
export const FALLBACK_CONFIRMATION_TITLE = `Reserva confirmada | ${SITE}`;

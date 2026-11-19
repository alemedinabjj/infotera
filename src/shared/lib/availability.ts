/** Quartos restantes a partir dos quais o card avisa que está acabando. */
export const SCARCE_THRESHOLD = 2;

export type AvailabilityStatus =
  | "sold-out"
  | "insufficient"
  /** Há quartos livres, mas nenhum comporta o grupo na quantidade de quartos pedida. */
  | "no-fit"
  | "scarce"
  | "available";

/**
 * Disponibilidade do hotel para a busca: sem quartos (`sold-out`), menos quartos que o pedido
 * (`insufficient`), poucos (`scarce`, ≤ 2) ou `available`. No modo `browse` use `requestedRooms = 1`.
 */
export const availabilityStatus = (
  availableRooms: number,
  requestedRooms: number,
): AvailabilityStatus => {
  if (availableRooms <= 0) return "sold-out";
  if (availableRooms < requestedRooms) return "insufficient";
  if (availableRooms <= SCARCE_THRESHOLD) return "scarce";
  return "available";
};

export type AvailabilityBadge = { tone: "danger" | "warning"; text: string };

export type AvailabilityDescription = {
  badge: AvailabilityBadge | null;
  /** Frase ao lado do preço quando o total não pode ser mostrado. */
  note: string | null;
};

type DescribeInput = {
  status: AvailabilityStatus;
  /** Hóspedes da busca (adultos + crianças), para o texto de `no-fit`. */
  guests?: number;
  availableRooms: number;
  requestedRooms: number;
  /** `stay` tem datas; no `browse` o esgotado diz "no momento". */
  hasDates: boolean;
};

const roomsText = (count: number): string => `${count} ${count === 1 ? "quarto" : "quartos"}`;

/** Selo e nota do card para cada disponibilidade (textos do design system §6.6). */
export const describeAvailability = ({
  status,
  availableRooms,
  requestedRooms,
  hasDates,
  guests = 0,
}: DescribeInput): AvailabilityDescription => {
  switch (status) {
    case "sold-out":
      return {
        badge: { tone: "danger", text: "Esgotado" },
        note: hasDates
          ? "Sem quartos disponíveis para estas datas."
          : "Sem quartos disponíveis no momento.",
      };
    case "insufficient":
      return {
        badge: {
          tone: "warning",
          text: `Só ${availableRooms} ${availableRooms === 1 ? "quarto disponível" : "quartos disponíveis"}`,
        },
        note: `Sua busca pede ${roomsText(requestedRooms)}.`,
      };
    case "no-fit":
      return {
        badge: { tone: "warning", text: "Não comporta o grupo" },
        note: `Nenhum quarto acomoda ${guests} ${guests === 1 ? "hóspede" : "hóspedes"} em ${roomsText(requestedRooms)}.`,
      };
    case "scarce":
      return {
        badge: { tone: "warning", text: `Apenas ${roomsText(availableRooms)}!` },
        note: null,
      };
    case "available":
      return { badge: null, note: null };
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
};

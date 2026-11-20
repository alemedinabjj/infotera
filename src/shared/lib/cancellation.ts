import type { CancellationPolicy } from "../api/schemas";

export type CancellationDetails = {
  label: string;
  tone: "success" | "neutral" | "warning";
  details: string[];
};

/**
 * Rótulo, tom do selo e regras da política. A API só informa a categoria: os detalhes são
 * **texto ilustrativo do produto** (prazos fixos por categoria), centralizados aqui para trocar
 * por dados reais quando existirem.
 */
export const cancellationDetails = (policy: CancellationPolicy): CancellationDetails => {
  switch (policy) {
    case "free":
      return {
        label: "Cancelamento grátis",
        tone: "success",
        details: [
          "Cancele grátis até 48 horas antes do check-in.",
          "Depois desse prazo, cobramos a primeira diária.",
          "Se você não comparecer, cobramos a primeira diária.",
        ],
      };
    case "moderate":
      return {
        label: "Cancelamento com reembolso parcial",
        tone: "neutral",
        details: [
          "Cancele até 7 dias antes do check-in e receba 50% do valor de volta.",
          "Depois desse prazo, não há reembolso.",
        ],
      };
    case "strict":
      return {
        label: "Sem reembolso em caso de cancelamento",
        tone: "warning",
        details: [
          "Esta tarifa não tem reembolso em caso de cancelamento.",
          "Mudança de datas depende de disponibilidade e pode ter custo.",
        ],
      };
    default: {
      const unreachable: never = policy;
      return unreachable;
    }
  }
};

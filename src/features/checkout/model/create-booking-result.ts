import type { ApiErrorKind } from "@/shared/api/http";
import { pluralize } from "@/shared/lib/format";
import { formatCents } from "@/shared/lib/price-breakdown";
import type { CheckoutFieldPath } from "./checkout.schema";
import type { CouponRejection } from "./coupons";
import type { PriceQuote } from "./price";

/** Retorno da Server Action. A action **não lança**: o Next esconde mensagens em produção. */
export type CreateBookingResult =
  | { status: "created"; bookingId: string }
  | { status: "price-changed"; quote: PriceQuote }
  | { status: "unavailable"; available: number }
  | { status: "coupon-invalid"; reason: CouponRejection }
  | { status: "invalid"; fields: CheckoutFieldPath[] }
  | { status: "failed"; kind: ApiErrorKind | "unknown" };

export type FailedResult = Exclude<CreateBookingResult, { status: "created" }>;

export type FeedbackAction = "retry" | "view-rooms" | "none";

export type SubmitFeedback = {
  tone: "warning" | "danger";
  title: string;
  description: string;
  action: FeedbackAction;
};

type FeedbackContext = {
  /** Total que a pessoa viu ao confirmar. */
  previousTotalCents: number;
  /** Total sem cupom (para o texto de `coupon-invalid`). */
  totalWithoutCouponCents: number;
  couponCode: string | null;
  online: boolean;
};

/** Eco em toast, só quando a chamada da action falha no transporte (o alerta inline já está visível nos demais casos). */
export const TRANSPORT_TOAST = "Não foi possível confirmar a reserva.";

const NOTHING_CHARGED = "Nada foi cobrado.";

const unavailableFeedback = (available: number): SubmitFeedback =>
  available === 0
    ? {
        tone: "warning",
        title: "Este quarto esgotou enquanto você reservava",
        description: `Escolha outro quarto no mesmo hotel. ${NOTHING_CHARGED}`,
        action: "view-rooms",
      }
    : {
        tone: "warning",
        title: `Só ${pluralize(available, "quarto disponível", "quartos disponíveis")} agora`,
        description: `Diminua a quantidade de quartos no resumo da reserva ou escolha outro quarto. ${NOTHING_CHARGED}`,
        action: "view-rooms",
      };

const failedFeedback = (online: boolean): SubmitFeedback =>
  online
    ? {
        tone: "danger",
        title: "Não foi possível confirmar sua reserva",
        description:
          "Nenhuma cobrança foi feita. Seus dados foram mantidos; tente de novo em instantes.",
        action: "retry",
      }
    : {
        tone: "warning",
        title: "Você está sem conexão.",
        description: "Nada foi cobrado. Tente de novo quando a conexão voltar.",
        action: "retry",
      };

/** Mensagem e ação de cada resultado que não é `created` (switch exaustivo). Nada vem do servidor. */
export const submitFeedback = (result: FailedResult, context: FeedbackContext): SubmitFeedback => {
  switch (result.status) {
    case "price-changed":
      return {
        tone: "warning",
        title: "O total da reserva mudou",
        description: `Passou de ${formatCents(context.previousTotalCents)} para ${formatCents(result.quote.totalCents)}. Confira o novo valor e confirme de novo. ${NOTHING_CHARGED}`,
        action: "none",
      };
    case "unavailable":
      return unavailableFeedback(result.available);
    case "coupon-invalid":
      return {
        tone: "warning",
        title: `O cupom ${context.couponCode ?? "informado"} não vale mais`,
        description: `Removemos o desconto e o total agora é ${formatCents(context.totalWithoutCouponCents)}. Confira e confirme de novo. ${NOTHING_CHARGED}`,
        action: "none",
      };
    case "invalid":
      return {
        tone: "warning",
        title: "Confira os dados da reserva",
        description: "Confira este dado e tente de novo.",
        action: "none",
      };
    case "failed":
      return failedFeedback(context.online);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
};

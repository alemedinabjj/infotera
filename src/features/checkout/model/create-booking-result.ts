import type { ApiErrorKind } from "@/shared/api/http";
import { pluralize } from "@/shared/lib/format";
import type { CheckoutFieldPath } from "./checkout.schema";
import type { CouponRejection } from "./coupons";
import type { PriceQuote } from "./price";
import { formatCents } from "./price-labels";

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
  /** Eco em toast (só falha de transporte). */
  toast: string | null;
};

type FeedbackContext = {
  /** Total que a pessoa viu ao confirmar. */
  previousTotalCents: number;
  /** Total sem cupom (para o texto de `coupon-invalid`). */
  totalWithoutCouponCents: number;
  couponCode: string | null;
  online: boolean;
};

const NOTHING_CHARGED = "Nada foi cobrado.";

const unavailableFeedback = (available: number): SubmitFeedback =>
  available === 0
    ? {
        tone: "warning",
        title: "Este quarto esgotou enquanto você reservava",
        description: `Escolha outro quarto no mesmo hotel. ${NOTHING_CHARGED}`,
        action: "view-rooms",
        toast: null,
      }
    : {
        tone: "warning",
        title: `Só ${pluralize(available, "quarto disponível", "quartos disponíveis")} agora`,
        description: `Diminua a quantidade de quartos no resumo da reserva ou escolha outro quarto. ${NOTHING_CHARGED}`,
        action: "view-rooms",
        toast: null,
      };

const failedFeedback = (online: boolean): SubmitFeedback =>
  online
    ? {
        tone: "danger",
        title: "Não foi possível confirmar sua reserva",
        description:
          "Nenhuma cobrança foi feita. Seus dados foram mantidos; tente de novo em instantes.",
        action: "retry",
        toast: "Não foi possível confirmar a reserva.",
      }
    : {
        tone: "warning",
        title: "Você está sem internet",
        description:
          "Assim que a conexão voltar, tente de novo. Nada foi cobrado e seus dados foram mantidos.",
        action: "retry",
        toast: "Não foi possível confirmar a reserva.",
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
        toast: null,
      };
    case "unavailable":
      return unavailableFeedback(result.available);
    case "coupon-invalid":
      return {
        tone: "warning",
        title: `O cupom ${context.couponCode ?? "informado"} não vale mais`,
        description: `Removemos o desconto e o total agora é ${formatCents(context.totalWithoutCouponCents)}. Confira e confirme de novo. ${NOTHING_CHARGED}`,
        action: "none",
        toast: null,
      };
    case "invalid":
      return {
        tone: "warning",
        title: "Confira os dados da reserva",
        description: "Confira este dado e tente de novo.",
        action: "none",
        toast: null,
      };
    case "failed":
      return failedFeedback(context.online);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
};

import type { ApiErrorKind } from "@/shared/api/http";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { formatCents } from "@/shared/lib/price-breakdown";
import { checkoutMessages } from "../i18n/messages";
import type { CheckoutMessages } from "../i18n/pt-BR";
import type { CheckoutFieldPath } from "./checkout.schema";
import type { CouponRejection } from "./coupons";
import type { PriceQuote } from "./price";

type SubmitMessages = CheckoutMessages["submit"];

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
export const transportToast = (locale: Locale = DEFAULT_LOCALE): string =>
  checkoutMessages.get(locale).submit.transportToast;

const unavailableFeedback = (available: number, t: SubmitMessages): SubmitFeedback =>
  available === 0
    ? {
        tone: "warning",
        title: t.soldOutTitle,
        description: `${t.soldOutBody} ${t.nothingCharged}`,
        action: "view-rooms",
      }
    : {
        tone: "warning",
        title: t.fewLeftTitle(available),
        description: `${t.fewLeftBody} ${t.nothingCharged}`,
        action: "view-rooms",
      };

const failedFeedback = (online: boolean, t: SubmitMessages): SubmitFeedback =>
  online
    ? { tone: "danger", title: t.failedTitle, description: t.failedBody, action: "retry" }
    : { tone: "warning", title: t.offlineTitle, description: t.offlineBody, action: "retry" };

/** Mensagem e ação de cada resultado que não é `created` (switch exaustivo). Nada vem do servidor. */
export const submitFeedback = (
  result: FailedResult,
  context: FeedbackContext,
  locale: Locale = DEFAULT_LOCALE,
): SubmitFeedback => {
  const t = checkoutMessages.get(locale).submit;
  const money = (cents: number) => formatCents(cents, locale);
  switch (result.status) {
    case "price-changed":
      return {
        tone: "warning",
        title: t.priceChangedTitle,
        description: `${t.priceChangedBody(money(context.previousTotalCents), money(result.quote.totalCents))} ${t.nothingCharged}`,
        action: "none",
      };
    case "unavailable":
      return unavailableFeedback(result.available, t);
    case "coupon-invalid":
      return {
        tone: "warning",
        title: t.couponTitle(context.couponCode),
        description: `${t.couponBody(money(context.totalWithoutCouponCents))} ${t.nothingCharged}`,
        action: "none",
      };
    case "invalid":
      return {
        tone: "warning",
        title: t.invalidTitle,
        description: t.invalidField,
        action: "none",
      };
    case "failed":
      return failedFeedback(context.online, t);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
};

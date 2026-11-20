import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { checkoutMessages } from "../i18n/messages";

export type CouponSnapshot =
  /** Sem cupom aplicado. */
  | { kind: "none" }
  | { kind: "valid"; code: string }
  | { kind: "ineligible"; code: string; message: string }
  | { kind: "error"; message: string };

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * Texto anunciado (região `aria-live`) quando o cupom muda de estado; `null` = nada a anunciar.
 * Cobre aplicar, remover, recusar, deixar de valer e voltar a valer quando os quartos mudam.
 */
export const describeCouponTransition = (
  previous: CouponSnapshot,
  next: CouponSnapshot,
  locale: Locale = DEFAULT_LOCALE,
): string | null => {
  const t = checkoutMessages.get(locale).coupon;
  if (previous.kind === next.kind && previous.kind !== "error") {
    return null;
  }
  switch (next.kind) {
    case "valid":
      return previous.kind === "ineligible" ? t.appliedAgain(next.code) : t.applied(next.code);
    case "ineligible":
      return t.stoppedWorking(next.code, lowerFirst(next.message));
    case "error":
      return next.message;
    case "none":
      return previous.kind === "valid" || previous.kind === "ineligible" ? t.removed : null;
    default: {
      const unreachable: never = next;
      return unreachable;
    }
  }
};

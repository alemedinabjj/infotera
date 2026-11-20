import type { Locale } from "@/shared/i18n/config";
import { checkoutMessages } from "../i18n/messages";

export type NoticeKind = "restored" | "payment-wiped";

/**
 * Texto do aviso do passo. Depois de restaurar o rascunho a idade das crianças nunca volta
 * (não é persistida), então o aviso do passo 1 pede para conferi-la quando há crianças.
 */
export const noticeText = (kind: NoticeKind, hasChildren: boolean, locale: Locale): string => {
  const t = checkoutMessages.get(locale).notices;
  switch (kind) {
    case "restored":
      return hasChildren ? t.restoredChildren : t.restored;
    case "payment-wiped":
      return t.paymentWiped;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
};

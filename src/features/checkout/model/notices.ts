export type NoticeKind = "restored" | "payment-wiped";

const PAYMENT_WIPED =
  "Por segurança, os dados do cartão não ficam salvos. Preencha o pagamento de novo.";

/**
 * Texto do aviso do passo. Depois de restaurar o rascunho a idade das crianças nunca volta
 * (não é persistida), então o aviso do passo 1 pede para conferi-la quando há crianças.
 */
export const noticeText = (kind: NoticeKind, hasChildren: boolean): string => {
  switch (kind) {
    case "restored":
      return hasChildren
        ? "Recuperamos os dados que você preencheu nesta sessão. Confira a idade das crianças."
        : "Recuperamos os dados que você preencheu nesta sessão.";
    case "payment-wiped":
      return PAYMENT_WIPED;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
};

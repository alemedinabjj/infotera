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
): string | null => {
  if (previous.kind === next.kind && previous.kind !== "error") {
    return null;
  }
  switch (next.kind) {
    case "valid":
      return previous.kind === "ineligible"
        ? `Cupom ${next.code} aplicado de novo.`
        : `Cupom ${next.code} aplicado.`;
    case "ineligible":
      return `O cupom ${next.code} deixou de valer: ${lowerFirst(next.message)} O total foi atualizado.`;
    case "error":
      return next.message;
    case "none":
      return previous.kind === "valid" || previous.kind === "ineligible" ? "Cupom removido." : null;
    default: {
      const unreachable: never = next;
      return unreachable;
    }
  }
};

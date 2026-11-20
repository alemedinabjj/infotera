const withCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const withoutCents = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type FormatBRLOptions = {
  /** `false` omite os centavos (ex.: preço por noite compacto). Padrão: `true`. */
  cents?: boolean;
};

/** Formata um valor em reais como `R$ 1.200,00` (espaço não separável entre `R$` e o número). */
export const formatBRL = (reais: number, { cents = true }: FormatBRLOptions = {}): string =>
  (cents ? withCents : withoutCents).format(reais);

/** Converte reais em centavos inteiros, sem erro de ponto flutuante. */
export const reaisToCents = (reais: number): number => Math.round(reais * 100);

/** Converte centavos inteiros em reais. */
export const centsToReais = (cents: number): number => cents / 100;

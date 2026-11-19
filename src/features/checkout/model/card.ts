export type CardBrand = "visa" | "mastercard" | "amex" | "elo" | "hipercard";

const BRAND_LABELS: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  elo: "Elo",
  hipercard: "Hipercard",
};

export const brandLabel = (brand: CardBrand): string => BRAND_LABELS[brand];

export const MIN_CARD_DIGITS = 13;
export const MAX_CARD_DIGITS = 19;

export const cardDigits = (value: string): string =>
  value.replace(/\D/g, "").slice(0, MAX_CARD_DIGITS);

/** Algoritmo de Luhn sobre 13–19 dígitos. */
export const isValidLuhn = (value: string): boolean => {
  const raw = value.replace(/\D/g, "");
  if (raw.length < MIN_CARD_DIGITS || raw.length > MAX_CARD_DIGITS) return false;
  let sum = 0;
  for (let index = 0; index < raw.length; index += 1) {
    let digit = Number(raw[raw.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

const ELO_PREFIXES = [
  /^4011(78|79)/,
  /^43(1274|8935)/,
  /^45(1416|7393|763[12])/,
  /^50(4175|6699|67[0-6]\d|677[0-8]|9\d{3})/,
  /^5067(0|1|2|3|4|5|6|7)/,
  /^627780/,
  /^636(297|368)/,
  /^65(0(0(3[1-3]|3[5-9]|4\d|5[0-1])|4(0[5-9]|[1-3]\d|8[5-9]|9\d)|5([0-2]\d|3[0-8]|4[1-9]|[5-8]\d|9[0-8])|7(0\d|1[0-8]|2[0-7]))|16(5[2-9]|[6-7]\d)|50(0\d|1[0-9]|2[1-9]|[3-4]\d|5[0-8]))/,
];
const HIPERCARD_PREFIXES = [/^606282/, /^3841(00|40|60)/];

const matchesAny = (patterns: readonly RegExp[], digits: string): boolean =>
  patterns.some((pattern) => pattern.test(digits));

/**
 * Bandeira pelo prefixo. Elo e Hipercard vêm **antes** de Visa/Master porque os prefixos colidem
 * (ex.: `4011`, `6362`, `5067`). `null` quando não reconhece.
 */
export const detectCardBrand = (value: string): CardBrand | null => {
  const digits = value.replace(/\D/g, "");
  if (matchesAny(ELO_PREFIXES, digits)) return "elo";
  if (matchesAny(HIPERCARD_PREFIXES, digits)) return "hipercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]|[3-6]\d|7[01]|720))/.test(digits)) return "mastercard";
  return null;
};

/** CVV: 4 dígitos para Amex, 3 para o resto. */
export const cvvLength = (brand: CardBrand | null): number => (brand === "amex" ? 4 : 3);

/** Grupos de 4 (Amex 4-6-5). Excesso descartado. */
export const formatCardNumber = (value: string): string => {
  const digits = cardDigits(value);
  if (detectCardBrand(digits) === "amex") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(" ");
  }
  return (digits.match(/.{1,4}/g) ?? []).join(" ");
};

/** Últimos 4 dígitos (único dado do cartão que sai do navegador). */
export const cardLast4 = (value: string): string => value.replace(/\D/g, "").slice(-4);

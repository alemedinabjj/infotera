export type PhoneCountry = "BR" | "US" | "PT" | "ES";

export type PhoneCountryInfo = {
  dialCode: string;
  label: string;
  maxDigits: number;
  example: string;
  /** Texto de apoio do campo (descrição). */
  hint: string;
};

export const PHONE_COUNTRIES: Record<PhoneCountry, PhoneCountryInfo> = {
  BR: {
    dialCode: "55",
    label: "Brasil +55",
    maxDigits: 11,
    example: "(11) 98765-4321",
    hint: "Com DDD, como (11) 98765-4321.",
  },
  US: {
    dialCode: "1",
    label: "Estados Unidos +1",
    maxDigits: 10,
    example: "(201) 555-0123",
    hint: "Como (201) 555-0123.",
  },
  PT: {
    dialCode: "351",
    label: "Portugal +351",
    maxDigits: 9,
    example: "912 345 678",
    hint: "Como 912 345 678.",
  },
  ES: {
    dialCode: "34",
    label: "Espanha +34",
    maxDigits: 9,
    example: "612 34 56 78",
    hint: "Como 612 34 56 78.",
  },
};

export const PHONE_COUNTRY_CODES = ["BR", "US", "PT", "ES"] as const satisfies PhoneCountry[];

/** DDDs em uso no Brasil (Anatel). */
export const BR_AREA_CODES: ReadonlySet<string> = new Set([
  ...["11", "12", "13", "14", "15", "16", "17", "18", "19"],
  ...["21", "22", "24", "27", "28"],
  ...["31", "32", "33", "34", "35", "37", "38"],
  ...["41", "42", "43", "44", "45", "46", "47", "48", "49"],
  ...["51", "53", "54", "55"],
  ...["61", "62", "63", "64", "65", "66", "67", "68", "69"],
  ...["71", "73", "74", "75", "77", "79"],
  ...["81", "82", "83", "84", "85", "86", "87", "88", "89"],
  ...["91", "92", "93", "94", "95", "96", "97", "98", "99"],
]);

/** Limite de digitação (E.164): acima disso o texto é cortado, nunca por país. */
export const MAX_PHONE_DIGITS = 15;

/**
 * Só os dígitos, sem truncar por país: o valor guardado no formulário. Trocar de país só muda a
 * máscara e a validação (o excesso vira erro de tamanho), então BR → US → BR preserva o número.
 */
export const phoneDigits = (raw: string): string =>
  raw.replace(/\D/g, "").slice(0, MAX_PHONE_DIGITS);

const groups = (digits: string, sizes: number[]): string => {
  const parts: string[] = [];
  let start = 0;
  for (const size of sizes) {
    if (start >= digits.length) break;
    parts.push(digits.slice(start, start + size));
    start += size;
  }
  if (start < digits.length) parts.push(digits.slice(start));
  return parts.join(" ");
};

const formatBR = (d: string): string => {
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const rest = d.slice(2);
  const split = d.length > 10 ? 5 : 4;
  const local = rest.length > split ? `${rest.slice(0, split)}-${rest.slice(split)}` : rest;
  return `(${d.slice(0, 2)}) ${local}`;
};

const formatUS = (d: string): string => {
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  const rest = d.slice(3);
  const local = rest.length > 3 ? `${rest.slice(0, 3)}-${rest.slice(3)}` : rest;
  return `(${d.slice(0, 3)}) ${local}`;
};

/** Máscara do país aplicada a qualquer texto (só os dígitos importam); o excesso vai no fim. */
export const formatPhone = (country: PhoneCountry, raw: string): string => {
  const digits = phoneDigits(raw);
  switch (country) {
    case "BR":
      return formatBR(digits);
    case "US":
      return formatUS(digits);
    case "PT":
      return groups(digits, [3, 3, 3]);
    case "ES":
      return groups(digits, [3, 2, 2, 2]);
    default: {
      const unreachable: never = country;
      return unreachable;
    }
  }
};

export type PhoneIssue = "length" | "area-code" | "mobile-nine" | "pattern";
export type PhoneCheck = { ok: true } | { ok: false; reason: PhoneIssue; areaCode?: string };

const fail = (reason: PhoneIssue, areaCode?: string): PhoneCheck =>
  areaCode === undefined ? { ok: false, reason } : { ok: false, reason, areaCode };

const checkBR = (d: string): PhoneCheck => {
  if (d.length !== 10 && d.length !== 11) return fail("length");
  const area = d.slice(0, 2);
  if (!BR_AREA_CODES.has(area)) return fail("area-code", area);
  const third = d.charAt(2);
  if (d.length === 11) return third === "9" ? { ok: true } : fail("mobile-nine");
  if (/[2-5]/.test(third)) return { ok: true }; // fixo
  return /[6-9]/.test(third) ? fail("mobile-nine") : fail("pattern");
};

const checkUS = (d: string): PhoneCheck => {
  if (d.length !== 10) return fail("length");
  const area = d.slice(0, 3);
  if (!/[2-9]/.test(area.charAt(0)) || (area.charAt(1) === "1" && area.charAt(2) === "1")) {
    return fail("area-code", area);
  }
  return /[2-9]/.test(d.charAt(3)) ? { ok: true } : fail("pattern");
};

const checkNine = (d: string, first: RegExp): PhoneCheck => {
  if (d.length !== 9) return fail("length");
  return first.test(d.charAt(0)) ? { ok: true } : fail("pattern");
};

/**
 * Valida o telefone pelas regras do país e devolve o **motivo** da falha (o schema o mapeia para a
 * mensagem). BR: DDD da Anatel + celular (11 dígitos, 9 na 3ª posição) ou fixo (10, 2–5). US: NANP.
 * PT: 9 dígitos começando com 9 ou 2. ES: 9 dígitos começando com 6–9.
 */
export const isValidPhone = (country: PhoneCountry, raw: string): PhoneCheck => {
  const d = raw.replace(/\D/g, "");
  switch (country) {
    case "BR":
      return checkBR(d);
    case "US":
      return checkUS(d);
    case "PT":
      return checkNine(d, /[92]/);
    case "ES":
      return checkNine(d, /[6-9]/);
    default: {
      const unreachable: never = country;
      return unreachable;
    }
  }
};

/** `+5511987654321`. */
export const toE164 = (country: PhoneCountry, raw: string): string =>
  `+${PHONE_COUNTRIES[country].dialCode}${raw.replace(/\D/g, "")}`;

/** `+55 (11) 98765-4321`, para a revisão. */
export const formatInternational = (country: PhoneCountry, raw: string): string =>
  `+${PHONE_COUNTRIES[country].dialCode} ${formatPhone(country, raw)}`;

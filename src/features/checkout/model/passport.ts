const PASSPORT_PATTERN = /^[A-Z0-9]{6,9}$/;

/** Maiúsculas, sem espaços e sem símbolos. */
export const normalizePassport = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Número de passaporte pelo formato do ICAO 9303: 6–9 caracteres `A–Z0–9`, ao menos 1 dígito e não
 * todos iguais. Não existe dígito verificador público do número fora da zona MRZ.
 */
export const isValidPassport = (value: string): boolean => {
  const normalized = normalizePassport(value);
  return PASSPORT_PATTERN.test(normalized) && /\d/.test(normalized) && new Set(normalized).size > 1;
};

/** Revisão: `******456` (só os 3 últimos). */
export const maskPassport = (value: string): string => {
  const normalized = normalizePassport(value);
  return `${"*".repeat(Math.max(normalized.length - 3, 0))}${normalized.slice(-3)}`;
};

export const MAX_EXPIRY_YEARS = 20;

export type ExpiryIssue = "format" | "month" | "expired" | "year";

/** `1228` → `12/28`; a barra entra depois do 2º dígito. */
export const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export type ParsedExpiry = { month: number; year: number };

/** `MM/AA` → mês e ano com 4 dígitos (2000+AA); `null` se o formato não bate. */
export const parseExpiry = (value: string): ParsedExpiry | null => {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return null;
  return { month: Number(match[1]), year: 2000 + Number(match[2]) };
};

/**
 * Valida `MM/AA` contra `today` (`YYYY-MM-DD`): mês 01–12, vale até o fim do mês e no máximo 20
 * anos à frente. Devolve `null` quando válida, senão o motivo.
 */
export const expiryIssue = (value: string, today: string): ExpiryIssue | null => {
  const parsed = parseExpiry(value);
  if (!parsed) return "format";
  if (parsed.month < 1 || parsed.month > 12) return "month";
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const diff = (parsed.year - currentYear) * 12 + (parsed.month - currentMonth);
  if (diff < 0) return "expired";
  if (diff > MAX_EXPIRY_YEARS * 12) return "year";
  return null;
};

export const isExpiryValid = (value: string, today: string): boolean =>
  expiryIssue(value, today) === null;

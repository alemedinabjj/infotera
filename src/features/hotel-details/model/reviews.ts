import type { Locale } from "@/shared/i18n/config";
import { formatCount } from "@/shared/lib/format";
import { hotelDetailsMessages } from "../i18n/messages";

/** `Mostrando 1–5 de 14 comentários` · `3 comentários` (uma página só) · `1 comentário` (e em inglês). */
export const reviewsRangeLabel = (
  page: number,
  total: number,
  pageSize: number,
  locale: Locale,
): string => {
  const t = hotelDetailsMessages.get(locale).reviews;
  if (total === 1) return t.one;
  if (total <= pageSize) return t.many({ count: total });
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return t.range({ from, to, total });
};

/** `42 pessoas acharam útil` · `1 pessoa achou útil` · `null` quando ninguém votou. */
export const helpfulLabel = (count: number, locale: Locale): string | null => {
  if (count <= 0) return null;
  const t = hotelDetailsMessages.get(locale).reviews;
  return count === 1 ? t.helpfulOne : t.helpfulMany({ count: formatCount(count, locale) });
};

/** Até 2 iniciais (primeiro e último nome) para o avatar sem foto: `Maria Silva` → `MS`. */
export const initials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0];
  if (first === undefined) return "";
  const last = words.length > 1 ? words[words.length - 1]?.[0] : undefined;
  return `${first}${last ?? ""}`.toLocaleUpperCase("pt-BR");
};

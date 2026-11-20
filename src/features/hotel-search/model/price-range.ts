import type { Locale } from "@/shared/i18n/config";
import { formatBRL } from "@/shared/lib/currency";
import { hotelSearchMessages } from "../i18n/messages";
import { PRICE_RANGE, type SearchFilters, serializeSearchFilters } from "./search-filters";

export type PriceDraft = { min: number; max: number };
export type PriceThumb = "min" | "max";

const reais = (value: number, locale: Locale): string => formatBRL(value, { cents: false, locale });

/**
 * Move um polegar sem ultrapassar o outro: o arrastado para no valor do outro (os papéis nunca
 * se invertem) e o valor fica dentro do domínio.
 */
export const movePriceThumb = (draft: PriceDraft, thumb: PriceThumb, value: number): PriceDraft => {
  const clamped = Math.min(Math.max(value, PRICE_RANGE.min), PRICE_RANGE.max);
  return thumb === "min"
    ? { min: Math.min(clamped, draft.max), max: draft.max }
    : { min: draft.min, max: Math.max(clamped, draft.min) };
};

/** `aria-valuetext` do slider: `R$ 500`; o topo do máximo é `R$ 3.000 ou mais`. */
export const priceValueText = (thumb: PriceThumb, value: number, locale: Locale): string =>
  thumb === "max" && value >= PRICE_RANGE.max
    ? hotelSearchMessages.get(locale).controls.priceMax({ price: reais(value, locale) })
    : reais(value, locale);

/** Resumo em texto acima dos sliders. */
export const describePriceSummary = ({ min, max }: PriceDraft, locale: Locale): string => {
  const t = hotelSearchMessages.get(locale).controls;
  const hasMin = min > PRICE_RANGE.min;
  const hasMax = max < PRICE_RANGE.max;
  if (hasMin && hasMax) return `${reais(min, locale)} – ${reais(max, locale)}`;
  if (hasMin) return t.priceFrom({ price: reais(min, locale) });
  if (hasMax) return t.priceUpTo({ price: reais(max, locale) });
  return t.priceAny;
};

/**
 * Chave dos filtros que não são o preço (nem a página): quando muda por fora (ex.: "Limpar
 * filtros"), o rascunho dos sliders volta à URL e qualquer gravação pendente é descartada.
 */
export const priceResetKey = (filters: SearchFilters): string =>
  serializeSearchFilters({
    ...filters,
    minPrice: PRICE_RANGE.min,
    maxPrice: PRICE_RANGE.max,
    page: 1,
  }).toString();

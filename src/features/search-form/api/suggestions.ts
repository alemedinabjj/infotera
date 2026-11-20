import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiGet } from "@/shared/api/http";
import { queryKeys } from "@/shared/api/query-keys";
import { type Suggestion, suggestionSchema } from "@/shared/api/schemas";
import { z } from "@/shared/lib/zod";
import { normalizeQuery } from "../model/suggestion-text";

const MIN_QUERY_LENGTH = 2;
const STALE_TIME_MS = 5 * 60_000;

const suggestionsSchema = z.array(suggestionSchema);

/** `GET /suggestions?q=` com o texto já normalizado (mesmo critério do servidor). */
export const fetchSuggestions = (q: string, signal?: AbortSignal): Promise<Suggestion[]> =>
  apiGet("/suggestions", suggestionsSchema, { query: { q: normalizeQuery(q) }, signal });

/** Só busca com 2+ caracteres úteis; "São" e "sao" dividem cache; lista anterior some só quando a nova chega. */
export const suggestionsQueryOptions = (q: string) => {
  const normalized = normalizeQuery(q);
  return queryOptions({
    queryKey: queryKeys.suggestions(normalized),
    queryFn: ({ signal }) => fetchSuggestions(normalized, signal),
    enabled: normalized.length >= MIN_QUERY_LENGTH,
    staleTime: STALE_TIME_MS,
    // Sem retry automático: a pessoa vê a falha na hora e decide em "Tentar de novo" (o padrão
    // seria ~3 s de backoff com o popover em "Buscando…").
    retry: 0,
    placeholderData: keepPreviousData,
  });
};

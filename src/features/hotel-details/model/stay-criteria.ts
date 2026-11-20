import { parseSearchCriteria, type SearchCriteria } from "@/shared/lib/search-params";

type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Critérios da estadia a partir do `searchParams` resolvido da rota. `null` quando faltam ou são
 * inválidos (a página mostra "Escolha as datas"). Puro: serve de `.then` da promessa de critérios.
 */
export const toStayCriteria = (raw: RawSearchParams): SearchCriteria | null => {
  const parsed = parseSearchCriteria(raw);
  return parsed.success ? parsed.data : null;
};

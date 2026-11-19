import { type SearchCriteria, searchCriteriaToQueryString } from "./search-params";

/** Link do card para o detalhe: com os critérios no modo `stay`, sem nada no `browse`. */
export const hotelHref = (hotelId: number, criteria: SearchCriteria | null): string =>
  criteria ? `/hotel/${hotelId}?${searchCriteriaToQueryString(criteria)}` : `/hotel/${hotelId}`;

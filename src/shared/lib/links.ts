import { type SearchCriteria, searchCriteriaToQueryString } from "./search-params";

/** Link do card para o detalhe: com os critérios no modo `stay`, sem nada no `browse`. */
export const hotelHref = (hotelId: number, criteria: SearchCriteria | null): string =>
  criteria ? `/hotel/${hotelId}?${searchCriteriaToQueryString(criteria)}` : `/hotel/${hotelId}`;

/** Link para a lista: com os critérios da busca (`stay`) ou só com o destino (`browse`). */
export const searchHref = (destination: string, criteria: SearchCriteria | null): string =>
  criteria
    ? `/search?${searchCriteriaToQueryString(criteria)}`
    : `/search?${new URLSearchParams({ destination }).toString()}`;

/** Aviso na home depois de um redirect (ex.: `/checkout` sem quarto escolhido). */
export const HOME_NOTICE_PARAM = "notice";
export const CHOOSE_ROOM_NOTICE = "choose-room";
export const CHOOSE_ROOM_HREF = `/?${HOME_NOTICE_PARAM}=${CHOOSE_ROOM_NOTICE}`;

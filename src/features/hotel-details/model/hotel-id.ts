const HOTEL_ID_PATTERN = /^[1-9]\d{0,8}$/;

/**
 * Id da rota `/hotel/[hotelId]`: só inteiro positivo sem zero à esquerda, até 9 dígitos. Qualquer
 * outra coisa (`abc`, `0`, `01`, `1.5`, `-1`, `1e3`, vazio) é `null`: a página responde "não
 * encontrado" sem chamar a API.
 */
export const parseHotelId = (raw: string): number | null =>
  HOTEL_ID_PATTERN.test(raw) ? Number(raw) : null;

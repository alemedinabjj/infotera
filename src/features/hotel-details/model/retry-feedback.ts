/** Acompanha o "Tentar de novo" de um cartão de erro que continua montado entre as tentativas. */
export type RetryTrack = { retrying: boolean; stillFailing: boolean };

export const IDLE_RETRY: RetryTrack = { retrying: false, stillFailing: false };

/**
 * Próximo estado a partir do `retrying` atual: terminar uma tentativa (`true` → `false`) com o cartão
 * ainda na tela quer dizer que falhou de novo (se desse certo, o cartão sairia). Começar outra tentativa
 * limpa o aviso.
 */
export const trackRetry = (track: RetryTrack, retrying: boolean): RetryTrack =>
  retrying === track.retrying ? track : { retrying, stillFailing: track.retrying && !retrying };

export type ConnectivityView = "hidden" | "offline" | "restored";

/** Quanto tempo "Conexão restabelecida." fica na tela. */
export const RESTORED_VISIBLE_MS = 4000;

/**
 * Decide o aviso global a partir da transição de conectividade: sem internet → `offline`; voltou
 * depois de ter caído → `restored` (o componente o esconde em `RESTORED_VISIBLE_MS`); o resto → nada.
 */
export const connectivityView = (prevOnline: boolean, online: boolean): ConnectivityView => {
  if (!online) return "offline";
  return prevOnline ? "hidden" : "restored";
};

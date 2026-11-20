/** `failed`: a rota falhou; `offline`: sem internet; `reconnected`: a conexão voltou com o cartão aberto. */
export type PhotoOpenStatus = "failed" | "offline" | "reconnected";

/**
 * Status do cartão de erro ao abrir a foto a partir da rede. `offlineCard`: o cartão nasceu do estado
 * "sem internet" (clique sem rede). Com ele aberto e a conexão de volta, a mensagem fica neutra: o motivo
 * da falha era a rede, não a rota. Sem ele (a rota falhou), `online` decide entre falha e sem internet.
 */
export const photoOpenStatus = (offlineCard: boolean, online: boolean): PhotoOpenStatus => {
  if (!offlineCard) return online ? "failed" : "offline";
  return online ? "reconnected" : "offline";
};

/** Seletor do "Tentar de novo" do cartão: o foco inicial do erro. */
export const PHOTO_RETRY_SELECTOR = "[role='alert'] button";

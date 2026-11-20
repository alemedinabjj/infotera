/**
 * Navegação com carga de documento (não é `router.push`). Usada para entrar em rotas cuja política
 * de segurança (CSP com nonce) é do documento: a F4 entra no checkout por aqui. Wrapper fino para
 * os testes poderem espiar a chamada.
 */
export const assignLocation = (path: string): void => {
  window.location.assign(path);
};

/** Recarrega o documento (wrapper fino, para os testes espiarem a chamada). */
export const reloadPage = (): void => {
  window.location.reload();
};

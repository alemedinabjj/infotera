/** Destino (`pathname + search`) de um envio válido que ainda espera a página receber os dados. */
let pendingHref: string | null = null;

const currentHref = (): string => `${window.location.pathname}${window.location.search}`;

/**
 * Chamar **só no envio válido**, com o href para onde a navegação vai. Se o destino já é a URL
 * atual (critérios idênticos) nada vai mudar, então não deixa sinal vivo. Um novo envio
 * sobrescreve o anterior.
 */
export const markFocusAfterNavigation = (href: string): void => {
  pendingHref = href === currentHref() ? null : href;
};

/**
 * Chamar em toda montagem (e a cada mudança dos dados que o envio altera). Consome o sinal (zera
 * sempre) e responde `true` só se a página já está no destino marcado: carga normal, Voltar ou
 * outra página nunca recebem o foco de um envio antigo.
 */
export const consumeFocusAfterNavigation = (): boolean => {
  const target = pendingHref;
  pendingHref = null;
  return target !== null && target === currentHref();
};

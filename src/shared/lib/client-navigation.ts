let navigated = false;

/** Marca que o usuário já navegou dentro do app (troca de rota sem recarregar o documento). */
export const markClientNavigation = (): void => {
  navigated = true;
};

/** `false` enquanto a página é a que abriu direto pela URL (carga de documento, reload, link externo). */
export const hasNavigatedClientSide = (): boolean => navigated;

/** Só para testes. */
export const resetClientNavigation = (): void => {
  navigated = false;
};

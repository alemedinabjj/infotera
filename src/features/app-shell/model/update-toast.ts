import { parsePublicPath } from "@/shared/i18n/paths";

/** Chave do toast de nova versão (nunca duplica). */
export const UPDATE_TOAST_KEY = "app-update";

/**
 * No checkout o aviso de nova versão não aparece: atualizar recarrega a página e perderia o que foi
 * digitado. Ele fica pendente e aparece na próxima rota.
 */
export const canShowUpdateToast = (pathname: string): boolean => {
  const { path } = parsePublicPath(pathname);
  return path !== "/checkout" && !path.startsWith("/checkout/");
};

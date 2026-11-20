import { copyText } from "../../lib/clipboard";
import { toast } from "./toast-store";

/** Grava a URL atual (com filtros e página) na área de transferência e avisa por toast. */
export const copyCurrentUrl = async (): Promise<void> => {
  if (await copyText(window.location.href)) {
    toast.success("Link copiado.");
  } else {
    toast.error("Não foi possível copiar. Copie o endereço na barra do navegador.");
  }
};

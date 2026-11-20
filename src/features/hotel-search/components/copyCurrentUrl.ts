import { toast } from "@/shared/ui";

/** Grava a URL atual (com filtros e página) na área de transferência e avisa por toast. */
export const copyCurrentUrl = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiado.");
  } catch {
    toast.error("Não foi possível copiar. Copie o endereço na barra do navegador.");
  }
};

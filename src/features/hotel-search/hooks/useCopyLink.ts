"use client";

import { toast } from "@/shared/ui";

/** `copy` grava a URL atual (com filtros e página) na área de transferência e avisa por toast. */
export const useCopyLink = (): { copy: () => Promise<void> } => ({
  copy: async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Copie o endereço na barra do navegador.");
    }
  },
});

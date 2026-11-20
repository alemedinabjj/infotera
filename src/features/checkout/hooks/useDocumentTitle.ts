"use client";

import { useEffect } from "react";
import { BRAND_NAME } from "@/shared/lib/brand";

/**
 * Título do documento por passo/estado. Efeito em vez de `<title>`: o `metadata` da rota define o
 * título inicial e o título do passo vem de estado de cliente.
 *
 * O React reescreve o texto do `<title>` hoisted do `metadata` logo depois da hidratação (dev e
 * produção), desfazendo o `document.title` do primeiro efeito. Por isso, enquanto o componente está
 * montado, um `MutationObserver` no `<head>` reafirma o título do passo sempre que ele muda.
 */
export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    const full = `${title} | ${BRAND_NAME}`;
    const apply = () => {
      if (document.title !== full) document.title = full;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
};

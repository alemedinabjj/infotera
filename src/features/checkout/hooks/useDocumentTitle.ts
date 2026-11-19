"use client";

import { useEffect } from "react";

const SUFFIX = "Infotera Hotéis";

/**
 * Título do documento por passo/estado. Efeito em vez de `<title>`: o `metadata` da rota define o
 * título inicial e a tag hoisted não o substitui de forma confiável na navegação entre passos.
 */
export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    document.title = `${title} | ${SUFFIX}`;
  }, [title]);
};

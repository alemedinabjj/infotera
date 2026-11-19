"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { sectionHeadingId } from "../model/sections";
import { focusHeading } from "./focus-heading";

/**
 * Página das avaliações em estado local (não é o conteúdo principal e Voltar não deve folhear
 * comentários). Trocar de página dentro de uma transition mantém a atual visível enquanto a
 * próxima carrega (`pending`): o `page` só muda quando o dado novo chega, então a paginação nunca
 * marca uma página cujo conteúdo ainda não está na tela.
 */
export const useReviewsPage = () => {
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const changePage = useCallback((next: number) => startTransition(() => setPage(next)), []);
  return { page, pending, changePage };
};

/**
 * Chegou uma página nova (não a carga inicial): o foco vai ao h2 "Avaliações", sem rolar e fora de
 * trás do header fixo. Usar dentro do conteúdo, que continua montado durante a transition.
 */
export const useFocusOnNewPage = (page: number): void => {
  const shown = useRef(page);
  useEffect(() => {
    if (shown.current === page) return;
    shown.current = page;
    focusHeading(sectionHeadingId("avaliacoes"));
  }, [page]);
};

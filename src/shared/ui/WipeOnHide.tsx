"use client";

import { type ReactNode, useLayoutEffect, useState } from "react";

/**
 * Rota privada (PII) sob `cacheComponents`: o Next não tem opt-out por rota do `<Activity>`, que
 * esconde com `display: none` e mantém o DOM. Aqui o cleanup do `useLayoutEffect` (roda ao esconder,
 * antes de pintar) troca os filhos por nada, então nada sensível fica no documento escondido.
 * Ao voltar, o effect reexibe os filhos que o servidor já enviou. Na primeira renderização (SSR e
 * hidratação) os filhos aparecem normalmente.
 */
export const WipeOnHide = ({ children }: { children: ReactNode }) => {
  const [hidden, setHidden] = useState(false);
  useLayoutEffect(() => {
    setHidden(false);
    return () => setHidden(true);
  }, []);
  return hidden ? null : children;
};

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { markClientNavigation } from "../lib/client-navigation";

/**
 * Avisa quando a rota muda sem recarregar o documento. Deve vir **antes** de `children` em
 * `AppProviders`: os efeitos rodam na ordem, então a página nova já enxerga a navegação.
 */
export const NavigationTracker = () => {
  const pathname = usePathname();
  const initial = useRef(pathname);
  useEffect(() => {
    if (pathname !== initial.current) markClientNavigation();
  }, [pathname]);
  return null;
};

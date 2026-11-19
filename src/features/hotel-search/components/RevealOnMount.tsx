"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { revealNearest } from "@/shared/lib/scroll";

type RevealOnMountProps = { children: ReactNode; className?: string };

/**
 * Quando a mensagem (erro, sem internet) aparece fora da tela, rola o mínimo para mostrá-la, sem
 * mover o foco: quem usa o teclado continua no controle que acionou a ação.
 */
export const RevealOnMount = ({ children, className }: RevealOnMountProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    revealNearest(ref.current);
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

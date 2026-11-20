"use client";

import { useEffect } from "react";
import { hasNavigatedClientSide } from "../lib/client-navigation";
import { revealBelowHeader } from "../lib/scroll";

type FocusOnMountProps = {
  /** Seletor CSS do alvo (ex.: `#titulo` ou `main h1`). O alvo ganha `tabindex="-1"` se não tiver. */
  selector: string;
  /**
   * Só foca quando se chegou por navegação dentro do app. Na página aberta direto pela URL o foco
   * programático no título desenharia um anel sem que ninguém tenha usado o teclado.
   */
  afterNavigationOnly?: boolean;
};

/**
 * Leva o foco ao alvo quando a página monta (chegada por `router.replace`, reload ou link), sem
 * rolar e sem deixá-lo atrás do header fixo. Não renderiza nada. Serve de ilha para títulos
 * renderizados no servidor.
 */
export const FocusOnMount = ({ selector, afterNavigationOnly = false }: FocusOnMountProps) => {
  useEffect(() => {
    if (afterNavigationOnly && !hasNavigatedClientSide()) return;
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    revealBelowHeader(target);
  }, [selector, afterNavigationOnly]);
  return null;
};

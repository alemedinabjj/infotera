"use client";

import { useCallback } from "react";

const CSS_VAR = "--bottom-bar-height";

/**
 * Ref callback da bandeja fixa: grava a altura medida (`ResizeObserver`) em `--bottom-bar-height`
 * no `<html>` e volta para `0px` quando a barra some. O `<main>`, o Toaster e o
 * `scroll-padding-bottom` leem a variável: o espaço cresce no fim da página, nada acima se move.
 */
export const useBottomBarInset = () =>
  useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty(CSS_VAR, `${node.offsetHeight}px`);
    apply();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    observer?.observe(node);
    return () => {
      observer?.disconnect();
      root.style.setProperty(CSS_VAR, "0px");
    };
  }, []);

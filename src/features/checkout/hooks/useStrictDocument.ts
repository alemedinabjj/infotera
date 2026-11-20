"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isCheckoutPath } from "@/shared/i18n/paths";
import type { DocumentState } from "../model/checkout-gate";

const subscribe = (): (() => void) => () => undefined;

/** O documento carregado (a URL de carga, não a atual) é `/checkout` ou `/en/checkout`? Só ele tem a CSP com nonce. */
const getSnapshot = (): DocumentState => {
  const name = performance.getEntriesByType("navigation")[0]?.name;
  if (!name) return "ok";
  try {
    return isCheckoutPath(new URL(name).pathname) ? "ok" : "reload";
  } catch {
    return "ok";
  }
};

/**
 * Garante a CSP estrita: se a pessoa chegou por navegação client-side (documento carregado em outra
 * rota, com a política frouxa), recarrega uma vez antes de mostrar o formulário. Não entra em loop:
 * depois do reload a URL de carga já é `/checkout`.
 */
export const useStrictDocument = (): DocumentState => {
  const state = useSyncExternalStore(subscribe, getSnapshot, (): DocumentState => "ok");
  useEffect(() => {
    if (state === "reload") window.location.reload();
  }, [state]);
  return state;
};

"use client";

import { useEffect } from "react";
import { consumeFocusAfterNavigation } from "@/shared/lib/focus-after-navigation";
import { sectionHeadingId } from "../model/sections";
import { focusHeading } from "./focus-heading";

/**
 * Depois de enviar datas válidas (o formulário marca o destino com `markFocusAfterNavigation`), o
 * foco vai ao h2 "Quartos" quando a página chega nesse destino. O sinal é consumido em toda
 * montagem e a cada mudança dos critérios: carga normal, Voltar e outras páginas não o recebem.
 */
export const useFocusAfterDates = (criteriaKey: string): void => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda a cada mudança dos critérios (a chave)
  useEffect(() => {
    if (consumeFocusAfterNavigation()) focusHeading(sectionHeadingId("quartos"));
  }, [criteriaKey]);
};

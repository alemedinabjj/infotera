"use client";

import { useEffect } from "react";
import { sectionHeadingId } from "../model/sections";
import { focusHeading } from "./focus-heading";

/** Envio do formulário de datas que ainda espera a página receber os critérios novos. */
let pendingEdit: { from: string } | null = null;

const forgetEdit = (): void => {
  pendingEdit = null;
};

/**
 * Chamar no envio do formulário de datas: quando os critérios mudarem (URL diferente), o foco vai
 * ao h2 "Quartos". O sinal guarda a URL de origem (envio inválido não navega e não conta) e morre
 * no Voltar/Avançar (`popstate`): carga normal e Voltar nunca mexem no foco.
 */
export const markDatesSubmitted = (): void => {
  pendingEdit = { from: window.location.search };
  window.addEventListener("popstate", forgetEdit, { once: true });
};

/** Depois de enviar as datas, leva o foco ao h2 "Quartos" (sem rolar, fora de trás do header). */
export const useFocusAfterDates = (criteriaKey: string): void => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: roda a cada mudança dos critérios (a chave)
  useEffect(() => {
    const edit = pendingEdit;
    if (edit === null || edit.from === window.location.search) return;
    pendingEdit = null;
    focusHeading(sectionHeadingId("quartos"));
  }, [criteriaKey]);
};

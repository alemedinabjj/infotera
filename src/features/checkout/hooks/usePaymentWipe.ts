"use client";

import { useCallback, useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useResetOnHide } from "@/shared/hooks/useResetOnHide";
import type { CheckoutValues } from "../model/checkout.schema";

const noop = () => undefined;

const SECRET_FIELDS = [
  "payment.cardNumber",
  "payment.expiry",
  "payment.cvv",
  "payment.document",
  "payment.cardName",
] as const;

/**
 * Dados de pagamento só em memória: no `pagehide` número, nome no cartão, validade, CVV e documento são limpos (o
 * snapshot do bfcache não guarda o cartão). Se a página voltar do bfcache depois disso,
 * `onRestored` avisa (o formulário leva ao passo de pagamento com o aviso). Com `cacheComponents` a rota
 * escondida (`Activity`) também é zerada: cartão nunca fica em DOM escondido, e `onHidden` roda logo
 * depois para a tela sair do que mostrava o cartão (a revisão) antes de a rota voltar.
 */
export const usePaymentWipe = (
  form: UseFormReturn<CheckoutValues>,
  onRestored: () => void,
  onHidden: () => void = noop,
) => {
  const wiped = useRef(false);
  const { resetField } = form;
  // O callback muda a cada render; o ref evita reassinar os listeners (e perder o `wiped`).
  const restored = useRef(onRestored);
  const hidden = useRef(onHidden);
  useEffect(() => {
    restored.current = onRestored;
    hidden.current = onHidden;
  });

  const wipe = useCallback(() => {
    for (const field of SECRET_FIELDS) resetField(field, { defaultValue: "" });
  }, [resetField]);
  useResetOnHide(() => {
    wipe();
    hidden.current();
  });

  useEffect(() => {
    const wipeOnHide = () => {
      wipe();
      wiped.current = true;
    };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted || !wiped.current) return;
      wiped.current = false;
      restored.current();
    };
    window.addEventListener("pagehide", wipeOnHide);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("pagehide", wipeOnHide);
      window.removeEventListener("pageshow", restore);
    };
  }, [wipe]);
};

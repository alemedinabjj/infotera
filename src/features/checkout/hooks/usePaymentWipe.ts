"use client";

import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CheckoutValues } from "../model/checkout.schema";

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
 * `onRestored` avisa (o formulário leva ao passo de pagamento com o aviso).
 */
export const usePaymentWipe = (form: UseFormReturn<CheckoutValues>, onRestored: () => void) => {
  const wiped = useRef(false);
  const { resetField } = form;
  // O callback muda a cada render; o ref evita reassinar os listeners (e perder o `wiped`).
  const restored = useRef(onRestored);
  useEffect(() => {
    restored.current = onRestored;
  });

  useEffect(() => {
    const wipe = () => {
      for (const field of SECRET_FIELDS) resetField(field, { defaultValue: "" });
      wiped.current = true;
    };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted || !wiped.current) return;
      wiped.current = false;
      restored.current();
    };
    window.addEventListener("pagehide", wipe);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("pagehide", wipe);
      window.removeEventListener("pageshow", restore);
    };
  }, [resetField]);
};

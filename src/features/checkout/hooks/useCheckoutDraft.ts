"use client";

import { useCallback, useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { createStorage } from "@/shared/lib/storage";
import type { CheckoutValues } from "../model/checkout.schema";
import { CHECKOUT_DRAFT_KEY, toPersistedDraft } from "../model/checkout-draft";
import type { CheckoutStep } from "../model/steps";

export const DRAFT_DEBOUNCE_MS = 500;

/**
 * Persistência do rascunho (grava o passo mais adiante alcançado) no `sessionStorage` com debounce de 500 ms e *flush* no `pagehide`.
 * O que vai ao storage é decidido por `toPersistedDraft` (whitelist): nunca cartão, CVV, validade,
 * documento, idade nem aceite (o código do cupom é gravado; o desconto é revalidado ao restaurar). `clear` apaga e **para** a gravação (reserva criada).
 */
export const useCheckoutDraft = (
  form: UseFormReturn<CheckoutValues>,
  reached: CheckoutStep,
  couponCode: string | null,
) => {
  const stepRef = useRef(reached);
  const couponRef = useRef(couponCode);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopped = useRef(false);
  const mounted = useRef(false);
  const dirty = useRef(false);

  const write = useCallback(() => {
    if (stopped.current || !dirty.current) return;
    createStorage("session").write(
      CHECKOUT_DRAFT_KEY,
      toPersistedDraft(form.getValues(), stepRef.current, couponRef.current),
    );
  }, [form]);

  const schedule = useCallback(() => {
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(write, DRAFT_DEBOUNCE_MS);
  }, [write]);

  useEffect(() => {
    stepRef.current = reached;
    // A montagem não grava (nada foi digitado); mudar de passo grava.
    if (mounted.current) schedule();
    mounted.current = true;
  }, [reached, schedule]);

  useEffect(() => {
    if (couponRef.current === couponCode) return;
    couponRef.current = couponCode;
    schedule();
  }, [couponCode, schedule]);

  useEffect(() => {
    const subscription = form.watch(schedule);
    return () => subscription.unsubscribe();
  }, [form, schedule]);

  useEffect(() => {
    const flush = () => {
      clearTimeout(timer.current);
      write();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      clearTimeout(timer.current);
    };
  }, [write]);

  const clear = useCallback(() => {
    stopped.current = true;
    clearTimeout(timer.current);
    createStorage("session").remove(CHECKOUT_DRAFT_KEY);
  }, []);

  return { clear };
};

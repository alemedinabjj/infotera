"use client";

import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useDeferredBlur } from "@/shared/hooks/useDeferredBlur";
import { revealBelowHeader } from "@/shared/lib/scroll";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { checkoutResolver } from "../model/checkout.resolver";
import type { CheckoutFieldPath, CheckoutValues } from "../model/checkout.schema";
import { stepOfField, summarizeCheckoutErrors } from "../model/error-summary";
import {
  CHECKOUT_STEPS,
  type CheckoutStep,
  nextStep,
  previousStep,
  STEP_FIELDS,
} from "../model/steps";
import { type CheckoutNotice, loadInitialCheckout } from "./checkout-initial";
import { useCheckoutDraft } from "./useCheckoutDraft";
import { usePaymentWipe } from "./usePaymentWipe";

export const INVALID_FIELD_MESSAGE = "Confira este dado e tente de novo.";

/**
 * Um `useForm` para os 3 passos (valores sobrevivem à troca de passo): validação por passo com
 * `trigger`, foco no `h2` ao trocar de passo, resumo de erros, rascunho e limpeza do pagamento.
 * O passo fica em estado do componente (não na URL).
 */
export const useCheckoutForm = (criteria: SearchCriteria) => {
  const [initial] = useState(() => loadInitialCheckout(criteria));
  const form = useForm<CheckoutValues>({
    resolver: checkoutResolver,
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: initial.values,
  });
  const { fields } = useFieldArray({ control: form.control, name: "companions" });
  const documentType = useWatch({ control: form.control, name: "payment.documentType" });

  const [step, setStep] = useState<CheckoutStep>(initial.step);
  const [notice, setNotice] = useState<CheckoutNotice | null>(initial.notice);
  const [attempts, setAttempts] = useState(0);
  const [focusTick, setFocusTick] = useState(0);
  const [fieldFocus, setFieldFocus] = useState<{ path: CheckoutFieldPath; tick: number } | null>(
    null,
  );
  const stepRef = useRef(step);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);
  const blur = useDeferredBlur(containerRef);
  const draft = useCheckoutDraft(form, step);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (focusTick === 0) return;
    headingRef.current?.focus({ preventScroll: true });
    revealBelowHeader(headingRef.current);
  }, [focusTick]);

  useEffect(() => {
    if (fieldFocus) form.setFocus(fieldFocus.path);
  }, [fieldFocus, form]);

  const summaryItems = summarizeCheckoutErrors({
    errors: form.formState.errors,
    step,
    companionKinds: fields.map((field) => field.kind),
    documentType,
  });
  const wantsFocus = useRef(false);
  // O resumo se revela ao montar (efeito do filho); o 1º campo inválido foca por último, assim que
  // os erros chegam ao render, e vence: o foco nunca fica atrás do header nem da barra fixa.
  useEffect(() => {
    const first = summaryItems[0]?.id;
    if (!wantsFocus.current || !first) return;
    wantsFocus.current = false;
    form.setFocus(first);
    // O campo já pode estar focado (o RHF focou antes) e o resumo acabou de rolar a página: traz o
    // campo de volta à vista respeitando o `scroll-padding` (header em cima, barra fixa embaixo).
    document.activeElement?.scrollIntoView?.({ block: "nearest" });
  });

  const moveTo = (target: CheckoutStep) => {
    setNotice(null);
    setStep(target);
    setFocusTick((tick) => tick + 1);
  };

  // Volta do bfcache depois do `pagehide`: o cartão foi apagado, então a revisão não pode aparecer.
  usePaymentWipe(form, () => {
    if (stepRef.current === "personal") return;
    moveTo("payment");
    setNotice({ kind: "payment-wiped", step: "payment" });
  });

  const markAttempt = () => {
    wantsFocus.current = true;
    setAttempts((count) => count + 1);
  };

  /** Valida o passo atual; se ok avança (foco no h2), se não foca o 1º campo inválido. */
  const goNext = async (): Promise<boolean> => {
    const valid = await form.trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (valid) moveTo(nextStep(step));
    else markAttempt();
    return valid;
  };

  /** Mostra o erro de um campo (ex.: resposta `invalid` do servidor) levando ao passo dele. */
  const showFieldError = (path: CheckoutFieldPath) => {
    form.setError(path, { type: "server", message: INVALID_FIELD_MESSAGE });
    moveTo(stepOfField(path));
    setAttempts((count) => count + 1);
    setFieldFocus((current) => ({ path, tick: (current?.tick ?? 0) + 1 }));
  };

  return {
    form,
    fields,
    step,
    stepIndex: CHECKOUT_STEPS.indexOf(step),
    notice: notice?.step === step ? notice : null,
    summary: attempts > 0 ? summaryItems : [],
    attempts,
    headingRef,
    containerRef,
    deferBlur: blur.defer,
    goNext,
    goBack: () => moveTo(previousStep(step)),
    goTo: moveTo,
    markAttempt,
    showFieldError,
    clearDraft: draft.clear,
  };
};

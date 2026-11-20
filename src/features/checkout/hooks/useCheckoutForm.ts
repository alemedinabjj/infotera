"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useDeferredBlur } from "@/shared/hooks/useDeferredBlur";
import { useLocale } from "@/shared/i18n/client";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { checkoutMessages } from "../i18n/messages";
import { makeCheckoutResolver } from "../model/checkout.resolver";
import type { CheckoutFieldPath, CheckoutValues } from "../model/checkout.schema";
import { stepOfField, summarizeCheckoutErrors } from "../model/error-summary";
import {
  CHECKOUT_STEPS,
  type CheckoutStep,
  furthestStep,
  nextStep,
  previousStep,
  STEP_FIELDS,
} from "../model/steps";
import { type CheckoutNotice, loadInitialCheckout } from "./checkout-initial";
import { useCheckoutDraft } from "./useCheckoutDraft";
import { useCheckoutFocus } from "./useCheckoutFocus";
import { usePaymentWipe } from "./usePaymentWipe";

/**
 * Um `useForm` para os 3 passos (valores sobrevivem à troca de passo): validação por passo com
 * `trigger`, foco no `h2` ao trocar de passo, resumo de erros, rascunho e limpeza do pagamento.
 * O passo fica em estado do componente (não na URL).
 */
export const useCheckoutForm = (criteria: SearchCriteria, couponCode: string | null = null) => {
  const locale = useLocale();
  const [initial] = useState(() => loadInitialCheckout(criteria));
  const resolver = useMemo(() => makeCheckoutResolver(locale), [locale]);
  const form = useForm<CheckoutValues>({
    resolver,
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: initial.values,
  });
  const { fields } = useFieldArray({ control: form.control, name: "companions" });
  const documentType = useWatch({ control: form.control, name: "payment.documentType" });

  const [step, setStep] = useState<CheckoutStep>(initial.step);
  const [notice, setNotice] = useState<CheckoutNotice | null>(initial.notice);
  const [attempts, setAttempts] = useState(0);
  const [reached, setReached] = useState(initial.reached);
  const paymentWipePending = useRef(initial.paymentWipePending);
  const stepRef = useRef(step);
  const containerRef = useRef<HTMLFormElement>(null);
  const blur = useDeferredBlur(containerRef);
  const draft = useCheckoutDraft(form, reached, couponCode);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const summaryItems = summarizeCheckoutErrors({
    errors: form.formState.errors,
    step,
    companionKinds: fields.map((field) => field.kind),
    documentType,
    locale,
  });
  const focus = useCheckoutFocus(form, summaryItems[0]?.id);

  const moveTo = (target: CheckoutStep) => {
    setReached((current) => furthestStep(current, target));
    // Restaurou no passo 1 depois de ter passado dele: ao chegar ao pagamento, o aviso do cartão.
    const wiped = paymentWipePending.current && target === "payment";
    if (wiped) paymentWipePending.current = false;
    setNotice(wiped ? { kind: "payment-wiped", step: target } : null);
    setStep(target);
    focus.focusHeading();
  };

  const backToPaymentWiped = () => {
    moveTo("payment");
    setNotice({ kind: "payment-wiped", step: "payment" });
  };

  // Volta do bfcache depois do `pagehide`: o cartão foi apagado, então a revisão não pode aparecer. O mesmo
  // vale quando a rota é escondida (`Activity`) na revisão: o resumo do cartão sai do DOM escondido.
  usePaymentWipe(
    form,
    () => {
      if (stepRef.current === "personal") return;
      backToPaymentWiped();
    },
    () => {
      if (stepRef.current === "review") backToPaymentWiped();
    },
  );

  const markAttempt = () => {
    focus.requestFieldFocus();
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
    form.setError(path, {
      type: "server",
      message: checkoutMessages.get(locale).submit.invalidField,
    });
    moveTo(stepOfField(path));
    setAttempts((count) => count + 1);
    focus.focusField(path);
  };

  return {
    form,
    fields,
    step,
    stepIndex: CHECKOUT_STEPS.indexOf(step),
    notice: notice?.step === step ? notice : null,
    summary: attempts > 0 ? summaryItems : [],
    attempts,
    headingRef: focus.headingRef,
    titleRef: focus.titleRef,
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

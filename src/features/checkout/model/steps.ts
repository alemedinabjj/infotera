import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { checkoutMessages } from "../i18n/messages";
import type { CheckoutFieldPath } from "./checkout.schema";

export const CHECKOUT_STEPS = ["personal", "payment", "review"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

/** Campos validados ao tentar sair de cada passo (`trigger`). */
export const STEP_FIELDS: Record<CheckoutStep, readonly CheckoutFieldPath[]> = {
  personal: ["contact", "companions"],
  payment: ["payment"],
  review: ["termsAccepted"],
};

/** Rótulo curto do passo (indicador de etapas). */
export const stepLabel = (step: CheckoutStep, locale: Locale = DEFAULT_LOCALE): string =>
  checkoutMessages.get(locale).steps.labels[step];

export const stepTitle = (step: CheckoutStep, locale: Locale = DEFAULT_LOCALE): string =>
  checkoutMessages.get(locale).steps.titles[step];

export const stepNumber = (step: CheckoutStep): number => CHECKOUT_STEPS.indexOf(step) + 1;

/** `Passo 2 de 3`. */
export const stepCounter = (step: CheckoutStep, locale: Locale = DEFAULT_LOCALE): string =>
  checkoutMessages.get(locale).steps.counter(stepNumber(step), CHECKOUT_STEPS.length);

/** Título do documento: `Passo 1 de 3: Dados dos hóspedes`. */
export const stepDocumentTitle = (step: CheckoutStep, locale: Locale = DEFAULT_LOCALE): string =>
  `${stepCounter(step, locale)}: ${stepTitle(step, locale)}`;

export const nextStep = (step: CheckoutStep): CheckoutStep =>
  CHECKOUT_STEPS[stepNumber(step)] ?? step;

export const previousStep = (step: CheckoutStep): CheckoutStep =>
  CHECKOUT_STEPS[stepNumber(step) - 2] ?? step;

/** Passos já concluídos ficam atrás do atual. */
export const isStepDone = (step: CheckoutStep, current: CheckoutStep): boolean =>
  stepNumber(step) < stepNumber(current);

/**
 * Passo ao restaurar o rascunho: pagamento nunca é restaurado, então `review` volta para
 * `payment`; dados pessoais inválidos voltam para `personal`.
 */
export const restoreStep = (step: CheckoutStep, personalValid: boolean): CheckoutStep => {
  if (!personalValid) return "personal";
  return step === "review" ? "payment" : step;
};

/** O passo mais adiante entre dois (o "passo máximo alcançado" do rascunho). */
export const furthestStep = (a: CheckoutStep, b: CheckoutStep): CheckoutStep =>
  stepNumber(a) >= stepNumber(b) ? a : b;

import type { CheckoutFieldPath } from "./checkout.schema";

export const CHECKOUT_STEPS = ["personal", "payment", "review"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

/** Campos validados ao tentar sair de cada passo (`trigger`). */
export const STEP_FIELDS: Record<CheckoutStep, readonly CheckoutFieldPath[]> = {
  personal: ["contact", "companions"],
  payment: ["payment"],
  review: ["termsAccepted"],
};

export const STEP_LABELS: Record<CheckoutStep, string> = {
  personal: "Hóspedes",
  payment: "Pagamento",
  review: "Revisão",
};

const STEP_TITLES: Record<CheckoutStep, string> = {
  personal: "Dados dos hóspedes",
  payment: "Pagamento",
  review: "Revise e confirme",
};

export const stepTitle = (step: CheckoutStep): string => STEP_TITLES[step];

export const stepNumber = (step: CheckoutStep): number => CHECKOUT_STEPS.indexOf(step) + 1;

/** `Passo 2 de 3`. */
export const stepCounter = (step: CheckoutStep): string =>
  `Passo ${stepNumber(step)} de ${CHECKOUT_STEPS.length}`;

/** Título do documento: `Passo 1 de 3: Dados dos hóspedes`. */
export const stepDocumentTitle = (step: CheckoutStep): string =>
  `${stepCounter(step)}: ${stepTitle(step)}`;

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
